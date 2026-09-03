import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
