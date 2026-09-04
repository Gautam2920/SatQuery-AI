import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.project import Project


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
        unique=True,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    #: Email verification is not built yet, so accounts are usable on creation.
    #: When verification lands this defaults to false and login checks it.
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    projects: Mapped[list["Project"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
    )
