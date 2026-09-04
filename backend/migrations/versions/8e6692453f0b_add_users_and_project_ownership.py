"""add users and project ownership

Revision ID: 8e6692453f0b
Revises: e91aa8f1f5e8
Create Date: 2026-09-04 15:11:19.722341

Projects that predate ownership are parked under a placeholder account rather
than deleted, so no uploaded raster is lost. Reassign them to a real account with:

    UPDATE projects SET owner_id = (SELECT id FROM users WHERE email = 'you@example.com')
    WHERE owner_id = (SELECT id FROM users WHERE email = 'legacy@satquery.local');
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "8e6692453f0b"
down_revision: Union[str, Sequence[str], None] = "e91aa8f1f5e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGACY_OWNER_EMAIL = "legacy@satquery.local"

# bcrypt hash of no derivable password, so the placeholder cannot be signed into.
UNUSABLE_PASSWORD_HASH = "!"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "is_verified",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.add_column("projects", sa.Column("owner_id", sa.UUID(), nullable=True))

    # Only create the placeholder if there is actually something to park.
    op.execute(
        sa.text(
            """
            INSERT INTO users (email, password_hash)
            SELECT :email, :password_hash
            WHERE EXISTS (SELECT 1 FROM projects WHERE owner_id IS NULL)
            """
        ).bindparams(email=LEGACY_OWNER_EMAIL, password_hash=UNUSABLE_PASSWORD_HASH)
    )
    op.execute(
        sa.text(
            """
            UPDATE projects
            SET owner_id = (SELECT id FROM users WHERE email = :email)
            WHERE owner_id IS NULL
            """
        ).bindparams(email=LEGACY_OWNER_EMAIL)
    )

    op.alter_column("projects", "owner_id", nullable=False)
    op.create_index(
        op.f("ix_projects_owner_id"),
        "projects",
        ["owner_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_projects_owner_id_users",
        "projects",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_projects_owner_id_users", "projects", type_="foreignkey")
    op.drop_index(op.f("ix_projects_owner_id"), table_name="projects")
    op.drop_column("projects", "owner_id")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
