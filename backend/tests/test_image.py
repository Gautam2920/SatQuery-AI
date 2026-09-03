from pathlib import Path

from geoalchemy2.shape import from_shape
from shapely import wkt
from sqlalchemy import func, select

from backend.app.models.image import Image
from backend.app.models.project import Project
from backend.app.services.raster_metadata import (
    extract_raster_footprint,
    extract_raster_metadata,
)
from backend.app.services.spatial import find_images_containing_point


FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"


def test_create_and_read_image(db_session):
    metadata = extract_raster_metadata(FIXTURE)

    project = Project(
        name="Image Test Project",
        description="Database integration test for images",
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    image = Image(
        project_id=project.id,
        filename="sample_satellite.tif",
        storage_key="projects/test/sample_satellite.tif",
        mime_type="image/tiff",
        file_size=FIXTURE.stat().st_size,
        width=metadata.width,
        height=metadata.height,
        band_count=metadata.band_count,
        dtype=metadata.dtype,
        crs=metadata.crs,
        bounds_left=metadata.bounds.left,
        bounds_bottom=metadata.bounds.bottom,
        bounds_right=metadata.bounds.right,
        bounds_top=metadata.bounds.top,
    )

    db_session.add(image)
    db_session.flush()
    db_session.refresh(image)

    assert image.id is not None
    assert image.project_id == project.id
    assert image.filename == "sample_satellite.tif"
    assert image.width == 10
    assert image.height == 10
    assert image.band_count == 3
    assert image.dtype == "uint16"
    assert image.crs == "EPSG:4326"
    assert image.bounds_left == 77.0
    assert image.bounds_bottom == 27.9
    assert image.bounds_right == 77.1
    assert image.bounds_top == 28.0


def test_persist_image_footprint(db_session):
    metadata = extract_raster_metadata(FIXTURE)
    footprint = extract_raster_footprint(FIXTURE)

    assert footprint.is_valid
    assert footprint.geom_type == "Polygon"
    assert footprint.bounds == (77.0, 27.9, 77.1, 28.0)

    project = Project(
        name="Footprint Persistence Test Project",
        description="Database integration test for image footprints",
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    image = Image(
        project_id=project.id,
        filename="sample_satellite.tif",
        storage_key="projects/test/sample_satellite.tif",
        mime_type="image/tiff",
        file_size=FIXTURE.stat().st_size,
        width=metadata.width,
        height=metadata.height,
        band_count=metadata.band_count,
        dtype=metadata.dtype,
        crs=metadata.crs,
        bounds_left=metadata.bounds.left,
        bounds_bottom=metadata.bounds.bottom,
        bounds_right=metadata.bounds.right,
        bounds_top=metadata.bounds.top,
        footprint=from_shape(footprint, srid=4326),
    )

    db_session.add(image)
    db_session.flush()
    db_session.refresh(image)

    stored_footprint = db_session.scalar(
        select(func.ST_AsText(Image.footprint)).where(Image.id == image.id)
    )

    stored_srid = db_session.scalar(
        select(func.ST_SRID(Image.footprint)).where(Image.id == image.id)
    )

    stored_validity = db_session.scalar(
        select(func.ST_IsValid(Image.footprint)).where(Image.id == image.id)
    )

    assert stored_footprint is not None

    stored_geometry = wkt.loads(stored_footprint)

    assert stored_geometry.equals(footprint)
    assert stored_srid == 4326
    assert stored_validity is True


def test_find_images_containing_point(db_session):
    metadata = extract_raster_metadata(FIXTURE)
    footprint = extract_raster_footprint(FIXTURE)

    project = Project(
        name="Spatial Query Test Project",
        description="Database integration test for spatial queries",
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    image = Image(
        project_id=project.id,
        filename="sample_satellite.tif",
        storage_key="projects/test/sample_satellite.tif",
        mime_type="image/tiff",
        file_size=FIXTURE.stat().st_size,
        width=metadata.width,
        height=metadata.height,
        band_count=metadata.band_count,
        dtype=metadata.dtype,
        crs=metadata.crs,
        bounds_left=metadata.bounds.left,
        bounds_bottom=metadata.bounds.bottom,
        bounds_right=metadata.bounds.right,
        bounds_top=metadata.bounds.top,
        footprint=from_shape(footprint, srid=4326),
    )

    db_session.add(image)
    db_session.flush()
    db_session.refresh(image)

    matching_images = find_images_containing_point(
        db_session=db_session,
        longitude=77.05,
        latitude=27.95,
    )

    assert len(matching_images) == 1
    assert matching_images[0].id == image.id


def test_find_images_containing_point_returns_empty_for_outside_point(
    db_session,
):
    metadata = extract_raster_metadata(FIXTURE)
    footprint = extract_raster_footprint(FIXTURE)

    project = Project(
        name="Spatial Query Outside Test Project",
        description="Database integration test for outside spatial queries",
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    image = Image(
        project_id=project.id,
        filename="sample_satellite.tif",
        storage_key="projects/test/sample_satellite.tif",
        mime_type="image/tiff",
        file_size=FIXTURE.stat().st_size,
        width=metadata.width,
        height=metadata.height,
        band_count=metadata.band_count,
        dtype=metadata.dtype,
        crs=metadata.crs,
        bounds_left=metadata.bounds.left,
        bounds_bottom=metadata.bounds.bottom,
        bounds_right=metadata.bounds.right,
        bounds_top=metadata.bounds.top,
        footprint=from_shape(footprint, srid=4326),
    )

    db_session.add(image)
    db_session.flush()
    db_session.refresh(image)

    matching_images = find_images_containing_point(
        db_session=db_session,
        longitude=77.5,
        latitude=27.95,
    )

    assert matching_images == []
