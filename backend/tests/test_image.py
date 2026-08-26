import uuid
from pathlib import Path

from backend.app.models.image import Image
from backend.app.models.project import Project
from backend.app.services.raster_metadata import extract_raster_metadata


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
        width=metadata["width"],
        height=metadata["height"],
        band_count=metadata["band_count"],
        dtype=metadata["dtype"],
        crs=metadata["crs"],
        bounds_left=metadata["bounds"]["left"],
        bounds_bottom=metadata["bounds"]["bottom"],
        bounds_right=metadata["bounds"]["right"],
        bounds_top=metadata["bounds"]["top"],
    )

    db_session.add(image)
    db_session.flush()
    db_session.refresh(image)

    assert isinstance(image.id, uuid.UUID)
    assert image.project_id == project.id
    assert image.filename == "sample_satellite.tif"
    assert image.mime_type == "image/tiff"
    assert image.file_size == FIXTURE.stat().st_size

    assert image.width == 10
    assert image.height == 10
    assert image.band_count == 3
    assert image.dtype == "uint16"
    assert image.crs == "EPSG:4326"

    assert image.bounds_left == 77.0
    assert image.bounds_bottom == 27.9
    assert image.bounds_right == 77.1
    assert image.bounds_top == 28.0

    assert image.status == "uploaded"
    assert image.created_at is not None
    assert image.updated_at is not None

    retrieved = db_session.get(Image, image.id)

    assert retrieved is not None
    assert retrieved.id == image.id
    assert retrieved.project_id == project.id
    assert retrieved.filename == "sample_satellite.tif"

    assert retrieved.project.id == project.id
    assert retrieved.project.name == "Image Test Project"
