import uuid

from geoalchemy2 import functions as geospatial_functions
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.image import Image
from backend.app.models.project import Project


def find_images_containing_point(
    db_session: Session,
    longitude: float,
    latitude: float,
    owner_id: uuid.UUID,
) -> list[Image]:
    """
    Return the owner's images whose footprint contains the given point.

    Coordinates are expected in EPSG:4326:
    longitude first, latitude second.
    """
    point = Point(longitude, latitude)
    point_geometry = from_shape(point, srid=4326)

    query = (
        select(Image)
        .join(Project, Image.project_id == Project.id)
        .where(
            Project.owner_id == owner_id,
            Image.footprint.is_not(None),
            geospatial_functions.ST_Contains(
                Image.footprint,
                point_geometry,
            ),
        )
    )

    return list(db_session.scalars(query).all())
