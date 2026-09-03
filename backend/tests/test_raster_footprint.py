from pathlib import Path

from shapely.geometry import Polygon

from backend.app.services.raster_metadata import extract_raster_footprint


FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"


def test_extract_raster_footprint():
    footprint = extract_raster_footprint(FIXTURE)

    assert isinstance(footprint, Polygon)
    assert footprint.is_valid
    assert not footprint.is_empty

    assert footprint.bounds == (
        77.0,
        27.9,
        77.1,
        28.0,
    )
