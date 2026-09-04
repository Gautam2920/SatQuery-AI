import uuid
from typing import Literal

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    region_count: int = Field(default=4, ge=2, le=8)


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


class AnalysisResponse(BaseModel):
    run_id: str = Field(serialization_alias="runId")
    image_id: uuid.UUID = Field(serialization_alias="imageId")
    query: str
    intent: str
    elapsed: str
    scene: AnalysisScene
    answer: list[AnswerToken]
    confidence: float
    confidence_note: str = Field(serialization_alias="confidenceNote")
    provenance: list[Literal["interpreted", "measured", "change"]]
    regions: list[EvidenceRegion]
    stages: list[ExecutionStage]

    model_config = {"populate_by_name": True}
