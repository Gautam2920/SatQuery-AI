import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from backend.app.services.scene_compatibility import describe_incompatibility


class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID

    filename: str
    storage_key: str | None

    mime_type: str
    file_size: int

    width: int
    height: int
    band_count: int
    dtype: str

    crs: str | None

    bounds_left: float | None
    bounds_bottom: float | None
    bounds_right: float | None
    bounds_top: float | None

    acquisition_time: datetime | None
    status: str

    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def analysis_error(self) -> str | None:
        """Why this scene cannot be analysed, or null if it can.

        Rows stored before the ingestion rules existed can still be listed, so
        the client is told the reason rather than re-deriving the rules itself.
        """
        return describe_incompatibility(
            band_count=self.band_count,
            width=self.width,
            height=self.height,
            crs=self.crs,
        )
