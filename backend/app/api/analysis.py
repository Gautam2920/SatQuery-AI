from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, get_db
from backend.app.api.ownership import require_owned_image
from backend.app.models.user import User
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


@router.post(
    "/analysis",
    response_model=AnalysisResponse,
    response_model_by_alias=True,
)
def run_scene_analysis(
    image_id: UUID,
    analysis_request: AnalysisRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    image = require_owned_image(image_id, user, db)

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
    user: User = Depends(get_current_user),
):
    """True-colour PNG of exactly the tile the analysis runs on.

    The evidence boxes are expressed as percentages of that tile, so the canvas
    must show the same extent for them to line up.
    """
    image = require_owned_image(image_id, user, db)

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
