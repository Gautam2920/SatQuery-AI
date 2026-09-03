from pathlib import Path

from backend.app.models.project import Project
from backend.app.services.image_ingestion import ingest_raster


FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"


def test_ingest_raster(db_session):
    project = Project(
        name="Ingestion Test Project",
        description="Raster ingestion service test",
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    image = ingest_raster(
        db_session=db_session,
        project_id=project.id,
        file_path=FIXTURE,
        filename="sample_satellite.tif",
        storage_key="projects/test/sample_satellite.tif",
    )

    assert image.id is not None
    assert image.project_id == project.id
    assert image.filename == "sample_satellite.tif"
    assert image.storage_key == "projects/test/sample_satellite.tif"

    assert image.width == 10
    assert image.height == 10
    assert image.band_count == 3
    assert image.dtype == "uint16"
    assert image.crs == "EPSG:4326"

    assert image.bounds_left == 77.0
    assert image.bounds_bottom == 27.9
    assert image.bounds_right == 77.1
    assert image.bounds_top == 28.0
