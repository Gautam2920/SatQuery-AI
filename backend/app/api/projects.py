from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, get_db
from backend.app.api.ownership import require_owned_project
from backend.app.models.project import Project
from backend.app.models.user import User
from backend.app.schemas.project import ProjectCreate, ProjectResponse


router = APIRouter(
    prefix="/projects",
    tags=["projects"],
)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=user.id,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project


@router.get(
    "",
    response_model=list[ProjectResponse],
)
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = db.execute(
        select(Project)
        .where(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
    )

    return result.scalars().all()


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return require_owned_project(project_id, user, db)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = require_owned_project(project_id, user, db)

    db.delete(project)
    db.commit()
