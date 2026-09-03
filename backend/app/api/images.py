from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_db
from backend.app.models.project import Project
from backend.app.schemas.image import ImageResponse
from backend.app.services.image_ingestion import ingest_raster


router = APIRouter(
    prefix="/projects/{project_id}/images",
    tags=["images"],
)


@router.post(
    "",
    response_model=ImageResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_image(
    project_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    suffix = Path(file.filename).suffix

    if suffix.lower() not in {".tif", ".tiff"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only TIFF raster files are supported",
        )

    try:
        with NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_path = Path(temp_file.name)

            while chunk := file.file.read(1024 * 1024):
                temp_file.write(chunk)

        image = ingest_raster(
            db_session=db,
            project_id=project_id,
            file_path=temp_path,
            filename=file.filename,
            mime_type=file.content_type or "image/tiff",
        )

        return image

    except Exception:
        db.rollback()
        raise

    finally:
        if "temp_path" in locals():
            temp_path.unlink(missing_ok=True)
