from pathlib import Path

from backend.app.schemas.raster import RasterMetadata
from backend.app.services.raster_metadata import extract_raster_metadata


FIXTURE = Path(__file__).parent / "fixtures" / "sample_satellite.tif"


def test_raster_metadata_schema():
    metadata = extract_raster_metadata(FIXTURE)

    validated = RasterMetadata.model_validate(metadata)

    assert validated.width == 10
    assert validated.height == 10
    assert validated.band_count == 3
    assert validated.dtype == "uint16"
    assert validated.crs == "EPSG:4326"

    assert validated.bounds.left == 77.0
    assert validated.bounds.bottom == 27.9
    assert validated.bounds.right == 77.1
    assert validated.bounds.top == 28.0
