from pathlib import Path

from backend.app.models.project import Project
from backend.app.services.image_ingestion import ingest_raster


FIXTURE = Path(__file__).parent / "fixtures" / "hls_like_sample.tif"


def test_ingest_raster(db_session, db_owner):
    project = Project(
        name="Ingestion Test Project",
        description="Raster ingestion service test",
        owner_id=db_owner.id,
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    image = ingest_raster(
        db_session=db_session,
        project_id=project.id,
        file_path=FIXTURE,
        filename="hls_like_sample.tif",
        storage_key="projects/test/hls_like_sample.tif",
    )

    assert image.id is not None
    assert image.project_id == project.id
    assert image.filename == "hls_like_sample.tif"
    assert image.storage_key == "projects/test/hls_like_sample.tif"

    assert image.width == 256
    assert image.height == 256
    assert image.band_count == 6
    assert image.dtype == "int16"
    assert image.crs == "EPSG:32613"

    assert image.bounds_left == 500000.0
    assert image.bounds_bottom == 3292320.0
    assert image.bounds_right == 507680.0
    assert image.bounds_top == 3300000.0
