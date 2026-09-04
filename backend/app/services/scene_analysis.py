"""Orchestrates a single-scene analysis run.

Query intent, Prithvi region segmentation, geospatial measurement, aggregation and
answer synthesis are executed as discrete timed stages so the response can carry a
truthful execution trace. Every number reaching the user is either measured from
the raster or computed from the model's own output - nothing is authored here.
"""

import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from pyproj import Transformer

from satquery_ai.data.compatibility import PRITHVI_INPUT
from satquery_ai.perception.region_segmentation import (
    RegionSegmentation,
    SceneRegion,
)

from backend.app.geospatial.regions import (
    WGS84,
    MeasuredRegion,
    format_area,
    format_centroid,
    format_perimeter,
    measure_labelled_regions,
)
from backend.app.models.image import Image
from backend.app.schemas.analysis import (
    AnalysisResponse,
    AnalysisScene,
    AnswerToken,
    EvidenceRegion,
    ExecutionStage,
    RegionBox,
    StageDetail,
)
from backend.app.services.perception_model import get_region_segmenter
from backend.app.services.query_intent import (
    INTENT_RESOLVER,
    OFF_TOPIC_REFUSAL as QUERY_OUT_OF_SCOPE,
    QueryIntent,
    resolve_query_intent,
)
from backend.app.services.raster_storage import resolve_storage_path
from backend.app.services.scene_compatibility import describe_incompatibility



LABEL_DIAGNOSTIC_BANDS = {
    "water": "B03 B8A · NDWI",
    "dense vegetation": "B04 B8A · NDVI",
    "sparse vegetation": "B04 B8A · NDVI",
    "built-up or bare ground": "B8A B11 · NDBI",
    "unvegetated surface": "B04 B8A B11",
}

MINIMUM_REGION_PIXELS = 256
MAX_REPORTED_REGIONS = 8
METRES_PER_KILOMETRE = 1000


class SceneAnalysisError(Exception):
    pass


@dataclass(frozen=True)
class _GroundedRegion:
    evidence: EvidenceRegion
    area_square_metres: float
    land_cover: str


class _StageRecorder:
    def __init__(self) -> None:
        self.stages: list[ExecutionStage] = []
        self._started_at = time.perf_counter()

    def record(self, name: str, seconds: float, details: list[StageDetail]) -> None:
        self.stages.append(
            ExecutionStage(
                name=name,
                state="done",
                duration=f"{seconds:.2f} s",
                details=details,
            )
        )

    @property
    def total_seconds(self) -> float:
        return time.perf_counter() - self._started_at


def _pixel_box(pixel_bounds: tuple[int, int, int, int], tile_size: int) -> RegionBox:
    left, top, right, bottom = pixel_bounds

    return RegionBox(
        left=f"{left / tile_size * 100:.1f}%",
        top=f"{top / tile_size * 100:.1f}%",
        width=f"{(right - left) / tile_size * 100:.1f}%",
        height=f"{(bottom - top) / tile_size * 100:.1f}%",
    )


def _ground_regions(
    segmentation: RegionSegmentation,
    measured_regions: list[MeasuredRegion],
) -> list[_GroundedRegion]:
    regions_by_index: dict[int, SceneRegion] = {
        region.region_index: region for region in segmentation.regions
    }

    grounded: list[_GroundedRegion] = []

    for position, measured in enumerate(measured_regions, start=1):
        scene_region = regions_by_index[measured.region_index]

        grounded.append(
            _GroundedRegion(
                evidence=EvidenceRegion(
                    id=f"R{position}",
                    class_name=scene_region.land_cover,
                    area=format_area(measured.area_square_metres),
                    perimeter=format_perimeter(measured.perimeter_metres),
                    confidence=round(scene_region.label_agreement, 2),
                    centroid=format_centroid(
                        measured.centroid_longitude,
                        measured.centroid_latitude,
                    ),
                    bands=LABEL_DIAGNOSTIC_BANDS.get(
                        scene_region.land_cover,
                        PRITHVI_INPUT.band_summary,
                    ),
                    provenance="measured",
                    box=_pixel_box(measured.pixel_bounds, segmentation.tile_size),
                    geometry=measured.boundary_wgs84,
                ),
                area_square_metres=measured.area_square_metres,
                land_cover=scene_region.land_cover,
            )
        )

    return grounded


def _renumber(selected: list[_GroundedRegion]) -> list[_GroundedRegion]:
    """Evidence ids are assigned after filtering so R1 is the largest match."""
    return [
        _GroundedRegion(
            evidence=region.evidence.model_copy(update={"id": f"R{position}"}),
            area_square_metres=region.area_square_metres,
            land_cover=region.land_cover,
        )
        for position, region in enumerate(selected, start=1)
    ]


def _insufficient_evidence_refusal(
    intent: QueryIntent,
    land_cover_fractions: dict[str, float],
) -> str:
    """Explain what the scene actually showed instead of inventing an answer."""
    requested_fraction = sum(
        fraction
        for land_cover, fraction in land_cover_fractions.items()
        if land_cover in intent.land_cover_filter
    )

    if requested_fraction == 0:
        return (
            f"No pixel in the analysed tile satisfies {intent.description}. The "
            "spectral indices computed over this scene did not meet the threshold "
            "for that land cover anywhere, so there is no evidence to report."
        )

    return (
        f"No region of the analysed tile is predominantly {intent.focus}. It "
        f"accounts for {requested_fraction * 100:.1f}% of the tile as scattered "
        f"pixels below the {MINIMUM_REGION_PIXELS}-pixel minimum region size, "
        "which is too little evidence to locate."
    )


def _synthesize_answer(
    intent: QueryIntent,
    selected: list[_GroundedRegion],
    analysed_area_square_metres: float,
) -> list[AnswerToken]:
    total_area = sum(region.area_square_metres for region in selected)
    coverage = total_area / analysed_area_square_metres * 100

    subject = intent.focus if intent.focus else "the segmented regions"

    tokens: list[AnswerToken] = [
        AnswerToken(t="text", value=f"Analysis of {subject} covers "),
        AnswerToken(t="value", value=format_area(total_area), tone="measured"),
        AnswerToken(
            t="text",
            value=f" - {coverage:.1f}% of the analysed tile - across ",
        ),
        AnswerToken(t="value", value=str(len(selected)), tone="measured"),
        AnswerToken(t="text", value=" regions. The largest are "),
    ]

    largest = selected[:2]

    for position, region in enumerate(largest):
        if position:
            tokens.append(AnswerToken(t="text", value=" and "))

        tokens.append(
            AnswerToken(
                t="ref",
                value=region.evidence.id,
                region_id=region.evidence.id,
            )
        )

    dominant_label = largest[0].land_cover

    tokens.append(
        AnswerToken(
            t="text",
            value=(
                ". Regions were separated by the pretrained Prithvi encoder; "
                f"land cover ({dominant_label}) and every area figure are computed "
                "from spectral indices and the raster's own CRS."
            ),
        )
    )

    return tokens


def _scene_center_wgs84(image: Image) -> tuple[float | None, float | None]:
    if not image.crs:
        return None, None

    center_x = (image.bounds_left + image.bounds_right) / 2
    center_y = (image.bounds_bottom + image.bounds_top) / 2

    try:
        transformer = Transformer.from_crs(image.crs, WGS84, always_xy=True)
        longitude, latitude = transformer.transform(center_x, center_y)
    except Exception:
        return None, None

    return latitude, longitude


def _scene_summary(image: Image, segmentation: RegionSegmentation) -> AnalysisScene:
    ground_sample_distance = abs(image.bounds_right - image.bounds_left) / image.width
    tile_extent_kilometres = (
        segmentation.tile_size * ground_sample_distance / METRES_PER_KILOMETRE
    )

    latitude, longitude = _scene_center_wgs84(image)

    return AnalysisScene(
        id=Path(image.filename).stem,
        sensor="HLS Sentinel-2",
        crs=image.crs or "unknown",
        gsd=f"{ground_sample_distance:.0f} m/px",
        extent=f"{tile_extent_kilometres:.2f} x {tile_extent_kilometres:.2f} km",
        kind="optical",
        center_latitude=latitude,
        center_longitude=longitude,
    )


def _refused_response(
    image: Image,
    query: str,
    intent: QueryIntent,
    outcome: str,
    refusal: str,
    stages: list[ExecutionStage],
    elapsed_seconds: float,
    scene: AnalysisScene,
) -> AnalysisResponse:
    """A result that carries no answer.

    Everything that would imply an analysis happened is left empty: no regions,
    no confidence, and only the stages that genuinely ran.
    """
    return AnalysisResponse(
        run_id=uuid.uuid4().hex[:6],
        image_id=image.id,
        outcome=outcome,
        refusal=refusal,
        query=query,
        intent=intent.description,
        elapsed=f"{elapsed_seconds:.2f} s",
        scene=scene,
        answer=[],
        confidence=None,
        confidence_note=refusal,
        provenance=[],
        regions=[],
        stages=stages,
    )


def _scene_summary_without_segmentation(image: Image) -> AnalysisScene:
    ground_sample_distance = abs(image.bounds_right - image.bounds_left) / image.width
    width_kilometres = image.width * ground_sample_distance / METRES_PER_KILOMETRE
    height_kilometres = image.height * ground_sample_distance / METRES_PER_KILOMETRE

    latitude, longitude = _scene_center_wgs84(image)

    return AnalysisScene(
        id=Path(image.filename).stem,
        sensor="HLS Sentinel-2",
        crs=image.crs or "unknown",
        gsd=f"{ground_sample_distance:.0f} m/px",
        extent=f"{width_kilometres:.2f} x {height_kilometres:.2f} km",
        kind="optical",
        center_latitude=latitude,
        center_longitude=longitude,
    )


def analyze_scene(image: Image, query: str, region_count: int) -> AnalysisResponse:
    if image.storage_key is None:
        raise SceneAnalysisError(
            "This image has no stored raster; re-upload it before running an analysis."
        )

    try:
        raster_path = resolve_storage_path(image.storage_key)
    except FileNotFoundError as error:
        raise SceneAnalysisError(str(error)) from error

    incompatibility = describe_incompatibility(
        band_count=image.band_count,
        width=image.width,
        height=image.height,
        crs=image.crs,
    )

    if incompatibility is not None:
        raise SceneAnalysisError(incompatibility)

    recorder = _StageRecorder()

    started = time.perf_counter()
    intent = resolve_query_intent(query)
    recorder.record(
        "query understanding",
        time.perf_counter() - started,
        [
            StageDetail(label="resolver", value=INTENT_RESOLVER),
            StageDetail(label="intent", value=intent.description),
            StageDetail(
                label="matched terms",
                value=", ".join(intent.matched_terms) or "none",
            ),
        ],
    )

    if not intent.is_supported:
        return _refused_response(
            image=image,
            query=query,
            intent=intent,
            outcome="unsupported",
            refusal=intent.refusal or QUERY_OUT_OF_SCOPE,
            stages=recorder.stages,
            elapsed_seconds=recorder.total_seconds,
            scene=_scene_summary_without_segmentation(image),
        )

    segmenter = get_region_segmenter()

    started = time.perf_counter()
    try:
        segmentation = segmenter.segment(raster_path, region_count=region_count)
    except (ValueError, FileNotFoundError) as error:
        raise SceneAnalysisError(f"Scene interpretation failed: {error}") from error

    recorder.record(
        "scene interpretation",
        time.perf_counter() - started,
        [
            StageDetail(label="model", value=segmentation.source),
            StageDetail(label="device", value=str(segmenter.device)),
            StageDetail(
                label="patches",
                value=(
                    f"{segmentation.patch_grid[0]}x{segmentation.patch_grid[1]}"
                    f" x {segmentation.embedding_dim}d"
                ),
            ),
            StageDetail(label="regions", value=str(len(segmentation.regions))),
        ],
    )

    started = time.perf_counter()
    measured_regions = measure_labelled_regions(
        raster_path,
        segmentation.label_grid,
        minimum_pixel_count=MINIMUM_REGION_PIXELS,
    )
    grounded = _ground_regions(segmentation, measured_regions)
    recorder.record(
        "geospatial computation",
        time.perf_counter() - started,
        [
            StageDetail(label="operation", value="polygonize · area · centroid"),
            StageDetail(
                label="source",
                value="rasterio · shapely · pyproj",
                tone="measured",
            ),
            StageDetail(label="crs", value=image.crs or "unknown"),
            StageDetail(label="components", value=str(len(measured_regions))),
        ],
    )

    started = time.perf_counter()
    matching = [
        region
        for region in grounded
        if not intent.land_cover_filter or region.land_cover in intent.land_cover_filter
    ]
    selected = _renumber(matching[:MAX_REPORTED_REGIONS])

    analysed_area_square_metres = sum(region.area_square_metres for region in grounded)
    selected_area = sum(region.area_square_metres for region in selected)

    confidence = (
        sum(
            region.evidence.confidence * region.area_square_metres
            for region in selected
        )
        / selected_area
        if selected_area
        else 0.0
    )

    recorder.record(
        "aggregation",
        time.perf_counter() - started,
        [
            StageDetail(
                label="regions kept",
                value=f"{len(selected)}/{len(grounded)}",
            ),
            StageDetail(label="weighting", value="area-weighted label agreement"),
        ],
    )

    if not selected:
        return _refused_response(
            image=image,
            query=query,
            intent=intent,
            outcome="insufficient_evidence",
            refusal=_insufficient_evidence_refusal(
                intent,
                segmentation.land_cover_fractions,
            ),
            stages=recorder.stages,
            elapsed_seconds=recorder.total_seconds,
            scene=_scene_summary(image, segmentation),
        )

    started = time.perf_counter()
    answer = _synthesize_answer(intent, selected, analysed_area_square_metres or 1.0)
    recorder.record(
        "answer synthesis",
        time.perf_counter() - started,
        [
            StageDetail(label="composer", value="template · measured values only"),
            StageDetail(label="tokens", value=str(len(answer))),
        ],
    )

    return AnalysisResponse(
        run_id=uuid.uuid4().hex[:6],
        image_id=image.id,
        outcome="answered",
        refusal=None,
        query=query,
        intent=intent.description,
        elapsed=f"{recorder.total_seconds:.2f} s",
        scene=_scene_summary(image, segmentation),
        answer=answer,
        confidence=round(confidence, 2),
        confidence_note=(
            f"area-weighted spectral agreement across {len(selected)} regions"
        ),
        provenance=["interpreted", "measured"],
        regions=[region.evidence for region in selected],
        stages=recorder.stages,
    )
