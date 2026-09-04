"""Every data route belongs to an owner: unauthenticated callers are refused, and
one account can neither see nor reach another account's projects and scenes."""

import uuid
from pathlib import Path

import pytest


FIXTURE = Path(__file__).parent / "fixtures" / "hls_like_sample.tif"


def create_project(test_client, name="Owned project"):
    response = test_client.post("/projects", json={"name": name})
    assert response.status_code == 201, response.text

    return response.json()["id"]


def upload_image(test_client, project_id):
    with FIXTURE.open("rb") as file:
        response = test_client.post(
            f"/projects/{project_id}/images",
            files={"file": ("hls_like_sample.tif", file, "image/tiff")},
        )

    assert response.status_code == 201, response.text

    return response.json()["id"]


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/projects"),
        ("post", "/projects"),
        ("get", f"/projects/{uuid.uuid4()}"),
        ("delete", f"/projects/{uuid.uuid4()}"),
        ("get", f"/projects/{uuid.uuid4()}/images"),
        ("get", "/images/search?longitude=0&latitude=0"),
        ("post", f"/images/{uuid.uuid4()}/analysis"),
        ("get", f"/images/{uuid.uuid4()}/preview"),
    ],
)
def test_data_routes_reject_an_anonymous_caller(anonymous_client, method, path):
    response = getattr(anonymous_client, method)(path)

    assert response.status_code == 401


def test_health_stays_public(anonymous_client):
    assert anonymous_client.get("/health").status_code == 200


def test_a_project_list_shows_only_the_callers_own_projects(client, other_client):
    create_project(client, "Mine")
    create_project(other_client, "Theirs")

    names = [project["name"] for project in client.get("/projects").json()]

    assert names == ["Mine"]


def test_another_users_project_reads_as_missing(client, other_client):
    project_id = create_project(other_client)

    assert client.get(f"/projects/{project_id}").status_code == 404


def test_another_users_project_cannot_be_deleted(client, other_client):
    project_id = create_project(other_client)

    assert client.delete(f"/projects/{project_id}").status_code == 404
    assert other_client.get(f"/projects/{project_id}").status_code == 200


def test_images_cannot_be_uploaded_into_another_users_project(client, other_client):
    project_id = create_project(other_client)

    with FIXTURE.open("rb") as file:
        response = client.post(
            f"/projects/{project_id}/images",
            files={"file": ("hls_like_sample.tif", file, "image/tiff")},
        )

    assert response.status_code == 404


def test_another_users_images_are_not_listed(client, other_client):
    project_id = create_project(other_client)
    upload_image(other_client, project_id)

    assert client.get(f"/projects/{project_id}/images").status_code == 404


def test_another_users_image_cannot_be_analysed(client, other_client):
    image_id = upload_image(other_client, create_project(other_client))

    response = client.post(
        f"/images/{image_id}/analysis",
        json={"query": "Where is the vegetation?"},
    )

    assert response.status_code == 404


def test_another_users_image_preview_is_not_served(client, other_client):
    image_id = upload_image(other_client, create_project(other_client))

    assert client.get(f"/images/{image_id}/preview").status_code == 404


def test_spatial_search_does_not_cross_accounts(client, other_client):
    upload_image(other_client, create_project(other_client))

    # The fixture footprint covers this point; it must still not be visible.
    found = client.get("/images/search?longitude=77.05&latitude=27.95").json()

    assert found == []
