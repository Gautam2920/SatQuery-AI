from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.image import ImageResponse
from backend.app.services.spatial import find_images_containing_point


router = APIRouter(
    prefix="/images",
    tags=["images"],
)


@router.get(
    "/search",
    response_model=list[ImageResponse],
)
def search_images(
    longitude: float,
    latitude: float,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return find_images_containing_point(
        db_session=db,
        longitude=longitude,
        latitude=latitude,
        owner_id=user.id,
    )
