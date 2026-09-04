import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AnalysisRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    region_count: int = Field(default=4, ge=2, le=8)

    @field_validator("query")
    @classmethod
    def reject_blank_query(cls, query: str) -> str:
        if not query.strip():
            raise ValueError("Query cannot be blank")

        return query


class StageDetail(BaseModel):
    label: str
    value: str
    tone: Literal["default", "measured", "accent"] = "default"


class ExecutionStage(BaseModel):
    name: str
    state: Literal["pending", "running", "done", "failed"]
    duration: str
    details: list[StageDetail]


class RegionBox(BaseModel):
    left: str
    top: str
    width: str
    height: str


class EvidenceRegion(BaseModel):
    id: str
    class_name: str = Field(serialization_alias="className")
    area: str
    perimeter: str
    confidence: float
    centroid: str
    bands: str
    provenance: Literal["interpreted", "measured", "change"]
    box: RegionBox
    #: Region outline as a GeoJSON geometry in EPSG:4326, so an exported
    #: evidence bundle carries real coordinates rather than canvas percentages.
    geometry: dict

    model_config = {"populate_by_name": True}


class AnswerToken(BaseModel):
    t: Literal["text", "value", "ref"]
    value: str
    tone: Literal["default", "measured"] | None = None
    region_id: str | None = Field(default=None, serialization_alias="regionId")

    model_config = {"populate_by_name": True}


class AnalysisScene(BaseModel):
    id: str
    sensor: str
    crs: str
    gsd: str
    extent: str
    kind: Literal["optical", "sar"]
    #: Scene centre in EPSG:4326, so the canvas can report where it actually is.
    #: None when the raster carries no CRS to reproject from.
    center_latitude: float | None = Field(default=None, serialization_alias="centerLatitude")
    center_longitude: float | None = Field(
        default=None, serialization_alias="centerLongitude"
    )

    model_config = {"populate_by_name": True}


class AnalysisResponse(BaseModel):
    """The result of asking a scene a question.

    `outcome` is the discriminator the client must read before showing anything.
    Only "answered" carries an answer, a confidence and regions; the other two
    carry a `refusal` explaining why no analysis was performed, and the stage
    list then reports only the stages that actually ran.
    """

    run_id: str = Field(serialization_alias="runId")
    image_id: uuid.UUID = Field(serialization_alias="imageId")
    outcome: Literal["answered", "unsupported", "insufficient_evidence"]
    refusal: str | None = None
    query: str
    intent: str
    elapsed: str
    scene: AnalysisScene
    answer: list[AnswerToken]
    confidence: float | None
    confidence_note: str = Field(serialization_alias="confidenceNote")
    provenance: list[Literal["interpreted", "measured", "change"]]
    regions: list[EvidenceRegion]
    stages: list[ExecutionStage]

    model_config = {"populate_by_name": True}
