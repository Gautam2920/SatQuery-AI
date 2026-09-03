from shapely.geometry import Polygon

from backend.app.schemas.raster import RasterBounds


def build_footprint(bounds: RasterBounds) -> Polygon:
    return Polygon(
        [
            (bounds.left, bounds.bottom),
            (bounds.right, bounds.bottom),
            (bounds.right, bounds.top),
            (bounds.left, bounds.top),
            (bounds.left, bounds.bottom),
        ]
    )
