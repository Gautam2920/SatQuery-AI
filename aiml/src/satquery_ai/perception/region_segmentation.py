"""Scene region segmentation from pretrained Prithvi embeddings.

The Prithvi checkpoint SatQuery loads has a pretrained backbone but a randomly
initialised segmentation head, so its class predictions carry no meaning. This
module uses only the part of the model that is genuinely trained: it clusters the
encoder's patch embeddings into spatially coherent regions, then characterises
each region with deterministic spectral indices. Region labels are therefore
measured rather than predicted, and confidence is the share of a region's pixels
that actually satisfy its label's criteria.
"""

from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
import torch
from sklearn.cluster import KMeans

from satquery_ai.data.preprocessing import (
    PRITHVI_IMAGE_SIZE,
    load_prithvi_tile,
)
from satquery_ai.models.prithvi import PrithviModel
from satquery_ai.perception.spectral import (
    classify_land_cover,
    compute_spectral_indices,
)


SEGMENTATION_SOURCE = "prithvi-eo-v2-tiny-tl/encoder+kmeans"
DEFAULT_REGION_COUNT = 4
MIN_REGION_COUNT = 2
MAX_REGION_COUNT = 8


@dataclass(frozen=True)
class SceneRegion:
    region_index: int
    land_cover: str
    pixel_count: int
    label_agreement: float
    mean_ndwi: float
    mean_ndvi: float
    mean_ndbi: float


@dataclass(frozen=True)
class RegionSegmentation:
    source: str
    label_grid: np.ndarray
    regions: tuple[SceneRegion, ...]
    land_cover_fractions: dict[str, float]
    patch_grid: tuple[int, int]
    patch_size: int
    embedding_dim: int
    tile_size: int


def _summarize_region(
    region_index: int,
    region_mask: np.ndarray,
    indices,
    land_cover_labels: np.ndarray,
) -> SceneRegion:
    labels_in_region = land_cover_labels[region_mask]
    dominant_label, dominant_count = Counter(labels_in_region.tolist()).most_common(1)[0]

    return SceneRegion(
        region_index=region_index,
        land_cover=dominant_label,
        pixel_count=int(region_mask.sum()),
        label_agreement=float(dominant_count / labels_in_region.size),
        mean_ndwi=float(indices.ndwi[region_mask].mean()),
        mean_ndvi=float(indices.ndvi[region_mask].mean()),
        mean_ndbi=float(indices.ndbi[region_mask].mean()),
    )


class PrithviRegionSegmenter:
    def __init__(self, device: torch.device | None = None) -> None:
        self.model = PrithviModel(device=device)

    @property
    def device(self) -> torch.device:
        return self.model.device

    def segment(
        self,
        path: Path,
        region_count: int = DEFAULT_REGION_COUNT,
    ) -> RegionSegmentation:
        if not MIN_REGION_COUNT <= region_count <= MAX_REGION_COUNT:
            raise ValueError(
                f"region_count must be between {MIN_REGION_COUNT} and "
                f"{MAX_REGION_COUNT}, got {region_count}"
            )

        tile = load_prithvi_tile(path)
        patch_embeddings = self.model.encode_patches(tile.unsqueeze(0))[0].cpu().numpy()

        patch_count, embedding_dim = patch_embeddings.shape
        grid_side = int(round(patch_count**0.5))

        if grid_side * grid_side != patch_count:
            raise ValueError(
                f"Encoder returned {patch_count} patches, which is not a square grid"
            )

        standardized = (patch_embeddings - patch_embeddings.mean(axis=0)) / (
            patch_embeddings.std(axis=0) + 1e-6
        )

        clustering = KMeans(
            n_clusters=region_count,
            n_init=10,
            random_state=0,
        ).fit(standardized)

        patch_grid = clustering.labels_.reshape(grid_side, grid_side)
        patch_size = PRITHVI_IMAGE_SIZE // grid_side
        label_grid = np.kron(
            patch_grid,
            np.ones((patch_size, patch_size), dtype=np.int64),
        )

        with rasterio.open(path) as source:
            bands = source.read()[:, :PRITHVI_IMAGE_SIZE, :PRITHVI_IMAGE_SIZE]

        indices = compute_spectral_indices(bands)
        land_cover_labels = classify_land_cover(indices)

        regions = tuple(
            _summarize_region(
                region_index,
                label_grid == region_index,
                indices,
                land_cover_labels,
            )
            for region_index in range(region_count)
            if (label_grid == region_index).any()
        )

        pixel_total = land_cover_labels.size
        land_cover_fractions = {
            label: count / pixel_total
            for label, count in Counter(land_cover_labels.ravel().tolist()).items()
        }

        return RegionSegmentation(
            source=SEGMENTATION_SOURCE,
            label_grid=label_grid,
            land_cover_fractions=land_cover_fractions,
            regions=regions,
            patch_grid=(grid_side, grid_side),
            patch_size=patch_size,
            embedding_dim=embedding_dim,
            tile_size=PRITHVI_IMAGE_SIZE,
        )
