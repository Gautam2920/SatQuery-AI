from pathlib import Path
from uuid import uuid4

import pytest


HLS_SCENE = (
    Path(__file__).resolve().parents[2]
    / "aiml"
    / "data"
    / "raw"
    / "Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif"
)

THREE_BAND_FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"

requires_hls_scene = pytest.mark.skipif(
    not HLS_SCENE.is_file(),
    reason=f"Prithvi demo scene is not present at {HLS_SCENE}",
)


def create_project(client) -> str:
    return client.post("/projects", json={"name": "analysis"}).json()["id"]


def upload(client, project_id: str, path: Path) -> dict:
    with path.open("rb") as raster:
        response = client.post(
            f"/projects/{project_id}/images",
            files={"file": (path.name, raster, "image/tiff")},
        )

    assert response.status_code == 201

    return response.json()


def test_analysis_requires_an_existing_image(client):
    response = client.post(
        f"/images/{uuid4()}/analysis",
        json={"query": "Where is the water?"},
    )

    assert response.status_code == 404


def test_analysis_rejects_an_empty_query(client):
    image = upload(client, create_project(client), THREE_BAND_FIXTURE)

    response = client.post(f"/images/{image['id']}/analysis", json={"query": ""})

    assert response.status_code == 422


def test_analysis_rejects_an_out_of_range_region_count(client):
    image = upload(client, create_project(client), THREE_BAND_FIXTURE)

    response = client.post(
        f"/images/{image['id']}/analysis",
        json={"query": "Where is the water?", "region_count": 99},
    )

    assert response.status_code == 422


def test_analysis_rejects_an_image_without_six_bands(client):
    image = upload(client, create_project(client), THREE_BAND_FIXTURE)

    response = client.post(
        f"/images/{image['id']}/analysis",
        json={"query": "Where is the water?"},
    )

    assert response.status_code == 422
    assert "6 bands" in response.json()["detail"]


def test_upload_persists_the_raster_for_later_analysis(client):
    image = upload(client, create_project(client), THREE_BAND_FIXTURE)

    assert image["storage_key"] == f"{image['id']}.tif"


def test_preview_requires_an_existing_image(client):
    assert client.get(f"/images/{uuid4()}/preview").status_code == 404


@requires_hls_scene
def test_preview_renders_the_analysed_tile(client):
    image = upload(client, create_project(client), HLS_SCENE)

    response = client.get(f"/images/{image['id']}/preview")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")


@requires_hls_scene
def test_analysis_returns_measured_evidence(client):
    image = upload(client, create_project(client), HLS_SCENE)

    response = client.post(
        f"/images/{image['id']}/analysis",
        json={"query": "Where are the built-up and bare areas?", "region_count": 4},
    )

    assert response.status_code == 200

    result = response.json()

    assert result["intent"] == "locate built-up or bare ground"
    assert result["scene"]["crs"] == "EPSG:32613"
    assert result["scene"]["gsd"] == "30 m/px"
    assert result["provenance"] == ["interpreted", "measured"]
    assert 0.0 < result["confidence"] <= 1.0

    assert [stage["name"] for stage in result["stages"]] == [
        "query understanding",
        "scene interpretation",
        "geospatial computation",
        "aggregation",
        "answer synthesis",
    ]
    assert all(stage["state"] == "done" for stage in result["stages"])

    assert result["regions"]

    for region in result["regions"]:
        assert region["className"] == "built-up or bare ground"
        assert region["provenance"] == "measured"
        assert 0.0 < region["confidence"] <= 1.0
        assert region["area"].endswith(("km²", "m²"))
        assert region["centroid"].endswith("W")

        for edge in ("left", "top", "width", "height"):
            assert region["box"][edge].endswith("%")

    assert any(token["t"] == "ref" for token in result["answer"])
    assert any(token["t"] == "value" for token in result["answer"])


@requires_hls_scene
def test_analysis_reports_honestly_when_nothing_matches(client):
    image = upload(client, create_project(client), HLS_SCENE)

    result = client.post(
        f"/images/{image['id']}/analysis",
        json={"query": "Where is the water?", "region_count": 4},
    ).json()

    assert result["regions"] == []
    assert result["confidence"] == 0.0
    assert "no region matched" in result["confidenceNote"]


@requires_hls_scene
def test_query_selects_different_evidence_from_the_same_scene(client):
    image = upload(client, create_project(client), HLS_SCENE)

    def classes_for(query: str) -> set[str]:
        result = client.post(
            f"/images/{image['id']}/analysis",
            json={"query": query, "region_count": 4},
        ).json()

        return {region["className"] for region in result["regions"]}

    assert classes_for("Where is the vegetation?") == {"dense vegetation"}
    assert classes_for("Where is the bare ground?") == {"built-up or bare ground"}
