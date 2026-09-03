from pathlib import Path

from backend.app.services.raster_metadata import extract_raster_metadata


FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"


def test_extract_raster_metadata():
    metadata = extract_raster_metadata(FIXTURE)

    assert metadata.width == 10
    assert metadata.height == 10
    assert metadata.band_count == 3
    assert metadata.dtype == "uint16"
    assert metadata.crs == "EPSG:4326"

    assert metadata.bounds.left == 77.0
    assert metadata.bounds.bottom == 27.9
    assert metadata.bounds.right == 77.1
    assert metadata.bounds.top == 28.0
