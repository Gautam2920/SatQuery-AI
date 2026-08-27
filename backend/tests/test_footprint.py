from shapely.geometry import Polygon

from backend.app.geospatial.footprint import build_footprint
from backend.app.schemas.raster import RasterBounds


def test_build_footprint():
    bounds = RasterBounds(
        left=10,
        bottom=20,
        right=30,
        top=40,
    )

    footprint = build_footprint(bounds)

    assert isinstance(footprint, Polygon)
    assert footprint.is_valid
    assert footprint.bounds == (10, 20, 30, 40)
