import pytest

from backend.app.geospatial.crs import uses_metre_axes
from backend.app.services.scene_compatibility import describe_incompatibility


ANALYSABLE = dict(band_count=6, width=256, height=256, crs="EPSG:32613")


@pytest.mark.parametrize("crs", ["EPSG:32613", "EPSG:32634", "EPSG:3857"])
def test_projected_metre_systems_are_recognised(crs):
    assert uses_metre_axes(crs) is True


@pytest.mark.parametrize("crs", ["EPSG:4326", "EPSG:4269", "not-a-crs"])
def test_geographic_and_unparseable_systems_are_not(crs):
    assert uses_metre_axes(crs) is False


def test_a_six_band_metre_projected_tile_is_analysable():
    assert describe_incompatibility(**ANALYSABLE) is None


def test_band_count_is_reported_first():
    reason = describe_incompatibility(**{**ANALYSABLE, "band_count": 10})

    assert reason is not None
    assert "6 HLS bands" in reason
    assert "10" in reason


def test_an_undersized_raster_is_refused():
    reason = describe_incompatibility(**{**ANALYSABLE, "width": 120, "height": 120})

    assert reason is not None
    assert "224x224" in reason
    assert "120x120" in reason


def test_a_geographic_crs_is_refused_rather_than_silently_reprojected():
    reason = describe_incompatibility(**{**ANALYSABLE, "crs": "EPSG:4326"})

    assert reason is not None
    assert "EPSG:4326" in reason
    assert "square metres" in reason
    assert "UTM" in reason


def test_a_raster_without_a_crs_is_refused():
    reason = describe_incompatibility(**{**ANALYSABLE, "crs": None})

    assert reason is not None
    assert "no CRS" in reason


def test_the_users_ten_band_sentinel_tile_is_refused_for_its_band_count():
    """A real file from the reporter: 10 bands at 120x120 in EPSG:32634. Band
    selection alone would not rescue it, because it is undersized too."""
    reason = describe_incompatibility(
        band_count=10,
        width=120,
        height=120,
        crs="EPSG:32634",
    )

    assert reason is not None
    assert "6 HLS bands" in reason
