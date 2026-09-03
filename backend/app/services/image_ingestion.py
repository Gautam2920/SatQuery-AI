from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from backend.app.models.image import Image
from backend.app.services.raster_metadata import (
    extract_raster_footprint,
    extract_raster_metadata,
)


def ingest_raster(
    db_session: Session,
    project_id: UUID,
    file_path: str | Path,
    filename: str,
    storage_key: str | None = None,
    mime_type: str = "image/tiff",
) -> Image:
    file_path = Path(file_path)

    if not file_path.is_file():
        raise FileNotFoundError(f"Raster file not found: {file_path}")

    metadata = extract_raster_metadata(file_path)
    footprint = extract_raster_footprint(file_path)

    image = Image(
        project_id=project_id,
        filename=filename,
        storage_key=storage_key,
        mime_type=mime_type,
        file_size=file_path.stat().st_size,
        width=metadata.width,
        height=metadata.height,
        band_count=metadata.band_count,
        dtype=metadata.dtype,
        crs=metadata.crs,
        bounds_left=metadata.bounds.left,
        bounds_bottom=metadata.bounds.bottom,
        bounds_right=metadata.bounds.right,
        bounds_top=metadata.bounds.top,
    )

    from geoalchemy2.shape import from_shape

    image.footprint = from_shape(
        footprint,
        srid=4326,
    )

    db_session.add(image)
    db_session.commit()
    db_session.refresh(image)

    return image
