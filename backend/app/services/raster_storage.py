"""Local filesystem storage for ingested rasters.

Analysis needs the pixel data long after upload, so the uploaded file is kept on
disk and referenced by the image record's storage_key. MinIO is the intended
production replacement; this keeps that seam in one place.
"""

import shutil
from pathlib import Path
from uuid import UUID

from backend.app.core.config import settings


def storage_root() -> Path:
    root = Path(settings.raster_storage_dir)
    root.mkdir(parents=True, exist_ok=True)

    return root


def store_raster(image_id: UUID, source_path: str | Path, suffix: str) -> str:
    source_path = Path(source_path)
    storage_key = f"{image_id}{suffix.lower()}"

    shutil.copyfile(source_path, storage_root() / storage_key)

    return storage_key


def resolve_storage_path(storage_key: str) -> Path:
    stored_path = storage_root() / storage_key

    if not stored_path.is_file():
        raise FileNotFoundError(f"Stored raster is missing: {storage_key}")

    return stored_path
