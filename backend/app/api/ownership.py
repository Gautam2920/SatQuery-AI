"""Ownership checks shared by every route that reaches a user's own data.

A project or image belonging to somebody else is reported as missing rather than
forbidden, so the API never confirms that an id exists to a user who cannot see it.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.image import Image
from backend.app.models.project import Project
from backend.app.models.user import User


def require_owned_project(project_id: UUID, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)

    if project is None or project.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


def require_owned_image(image_id: UUID, user: User, db: Session) -> Image:
    image = db.get(Image, image_id)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    project = db.get(Project, image.project_id)

    if project is None or project.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    return image
