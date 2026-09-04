from pathlib import Path
from uuid import uuid4

from backend.app.models.project import Project


FIXTURE = Path(__file__).parent / "fixtures" / "hls_like_sample.tif"


def test_upload_image_api(client, db_session):
    project = Project(
        name="API Image Test Project",
        description="Image upload API test",
        owner_id=client.user_id,
    )

    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    with FIXTURE.open("rb") as file:
        response = client.post(
            f"/projects/{project.id}/images",
            files={
                "file": (
                    "hls_like_sample.tif",
                    file,
                    "image/tiff",
                )
            },
        )

    assert response.status_code == 201

    data = response.json()

    assert data["project_id"] == str(project.id)
    assert data["filename"] == "hls_like_sample.tif"
    assert data["mime_type"] == "image/tiff"
    assert data["width"] == 256
    assert data["height"] == 256
    assert data["band_count"] == 6
    assert data["dtype"] == "int16"
    assert data["crs"] == "EPSG:32613"
    assert data["analysis_error"] is None

    assert data["bounds_left"] == 500000.0
    assert data["bounds_bottom"] == 3292320.0
    assert data["bounds_right"] == 507680.0
    assert data["bounds_top"] == 3300000.0


def test_upload_image_api_returns_404_for_missing_project(client):
    project_id = uuid4()

    with FIXTURE.open("rb") as file:
        response = client.post(
            f"/projects/{project_id}/images",
            files={
                "file": (
                    "hls_like_sample.tif",
                    file,
                    "image/tiff",
                )
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"


def test_upload_image_api_rejects_non_tiff(client, db_session):
    project = Project(
        name="Invalid Image Test Project",
        description="Invalid image upload test",
        owner_id=client.user_id,
    )

    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    response = client.post(
        f"/projects/{project.id}/images",
        files={
            "file": (
                "sample.txt",
                b"not a raster",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only TIFF raster files are supported"
