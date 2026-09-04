from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_db
from backend.app.models.image import Image
from backend.app.schemas.analysis import AnalysisRequest, AnalysisResponse
from backend.app.services.scene_analysis import SceneAnalysisError, analyze_scene
from backend.app.services.scene_preview import (
    ScenePreviewError,
    render_analysed_tile_png,
)


router = APIRouter(
    prefix="/images/{image_id}",
    tags=["analysis"],
)


def _require_image(image_id: UUID, db: Session) -> Image:
    image = db.get(Image, image_id)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    return image


@router.post(
    "/analysis",
    response_model=AnalysisResponse,
    response_model_by_alias=True,
)
def run_scene_analysis(
    image_id: UUID,
    analysis_request: AnalysisRequest,
    db: Session = Depends(get_db),
):
    image = _require_image(image_id, db)

    try:
        return analyze_scene(
            image=image,
            query=analysis_request.query,
            region_count=analysis_request.region_count,
        )
    except SceneAnalysisError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error


@router.get("/preview")
def get_scene_preview(
    image_id: UUID,
    db: Session = Depends(get_db),
):
    """True-colour PNG of exactly the tile the analysis runs on.

    The evidence boxes are expressed as percentages of that tile, so the canvas
    must show the same extent for them to line up.
    """
    image = _require_image(image_id, db)

    try:
        png_bytes = render_analysed_tile_png(image)
    except ScenePreviewError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
