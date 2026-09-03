"""add image footprint

Revision ID: e91aa8f1f5e8
Revises: 438a46a4fa7d
Create Date: 2026-08-27 07:31:15.423589
"""

from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e91aa8f1f5e8"
down_revision: Union[str, Sequence[str], None] = "438a46a4fa7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "images",
        sa.Column(
            "footprint",
            geoalchemy2.types.Geometry(
                geometry_type="POLYGON",
                srid=4326,
                dimension=2,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("images", "footprint")
