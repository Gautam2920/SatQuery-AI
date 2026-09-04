from pathlib import Path

from backend.app.models.project import Project


FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"


def upload_test_image(client, db_session):
    project = Project(
        name="Spatial Search API Test Project",
        description="Test project for spatial image search",
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
                    "sample_satellite.tif",
                    file,
                    "image/tiff",
                )
            },
        )

    assert response.status_code == 201

    return project, response.json()


def test_search_images_api_returns_matching_image(client, db_session):
    project, image = upload_test_image(client, db_session)

    response = client.get(
        "/images/search",
        params={
            "longitude": 77.05,
            "latitude": 27.95,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == image["id"]
    assert data[0]["project_id"] == str(project.id)
    assert data[0]["filename"] == "sample_satellite.tif"


def test_search_images_api_returns_empty_for_outside_point(
    client,
    db_session,
):
    upload_test_image(client, db_session)

    response = client.get(
        "/images/search",
        params={
            "longitude": 77.5,
            "latitude": 27.95,
        },
    )

    assert response.status_code == 200
    assert response.json() == []


def test_search_images_api_returns_empty_when_no_images_exist(client):
    response = client.get(
        "/images/search",
        params={
            "longitude": 77.05,
            "latitude": 27.95,
        },
    )

    assert response.status_code == 200
    assert response.json() == []
