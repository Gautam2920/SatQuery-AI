"""Convert AI region labels in pixel space into measured geographic evidence.

The AI/ML layer decides which pixels belong together. Everything geographic —
polygon boundaries, area, perimeter, centroid coordinates — is computed here from
the raster's own affine transform and CRS, never inferred by a model.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.features import shapes
from scipy import ndimage
from shapely.geometry import mapping, shape
from shapely.ops import transform as transform_geometry, unary_union


WGS84 = "EPSG:4326"
SQUARE_METRES_PER_SQUARE_KILOMETRE = 1_000_000
METRES_PER_KILOMETRE = 1_000


@dataclass(frozen=True)
class MeasuredRegion:
    region_index: int
    pixel_count: int
    area_square_metres: float
    perimeter_metres: float
    centroid_longitude: float
    centroid_latitude: float
    pixel_bounds: tuple[int, int, int, int]
    #: GeoJSON geometry of the region outline in EPSG:4326, for export. The
    #: outline is simplified by half a pixel to keep the payload small; the
    #: area and perimeter above are measured on the full-resolution geometry.
    boundary_wgs84: dict


def _pixel_bounds(component_mask: np.ndarray) -> tuple[int, int, int, int]:
    rows, columns = np.nonzero(component_mask)

    return (
        int(columns.min()),
        int(rows.min()),
        int(columns.max()) + 1,
        int(rows.max()) + 1,
    )


def _component_geometry(component_mask: np.ndarray, transform):
    polygons = [
        shape(geometry)
        for geometry, value in shapes(
            component_mask.astype(np.uint8),
            mask=component_mask,
            transform=transform,
        )
        if value == 1
    ]

    return unary_union(polygons)


def measure_labelled_regions(
    raster_path: str | Path,
    label_grid: np.ndarray,
    minimum_pixel_count: int,
) -> list[MeasuredRegion]:
    """Split each AI region label into connected components and measure each one.

    A cluster of patch embeddings is rarely contiguous; splitting it into
    connected components is what turns a label into locatable evidence with a
    bounding box tight enough to draw on the canvas.
    """
    raster_path = Path(raster_path)

    with rasterio.open(raster_path) as source:
        transform = source.transform
        raster_crs = source.crs

    if raster_crs is None:
        raise ValueError(f"Raster has no CRS, cannot measure regions: {raster_path}")

    to_wgs84 = Transformer.from_crs(raster_crs, WGS84, always_xy=True)

    measured_regions: list[MeasuredRegion] = []

    for region_index in np.unique(label_grid):
        components, component_count = ndimage.label(label_grid == region_index)

        for component_index in range(1, component_count + 1):
            component_mask = components == component_index
            pixel_count = int(component_mask.sum())

            if pixel_count < minimum_pixel_count:
                continue

            geometry = _component_geometry(component_mask, transform)
            centroid = geometry.centroid
            longitude, latitude = to_wgs84.transform(centroid.x, centroid.y)
            outline = geometry.simplify(abs(transform.a) / 2, preserve_topology=True)
            boundary_wgs84 = mapping(
                transform_geometry(
                    lambda xs, ys: to_wgs84.transform(xs, ys),
                    outline,
                )
            )

            measured_regions.append(
                MeasuredRegion(
                    region_index=int(region_index),
                    pixel_count=pixel_count,
                    area_square_metres=float(geometry.area),
                    perimeter_metres=float(geometry.length),
                    centroid_longitude=float(longitude),
                    centroid_latitude=float(latitude),
                    pixel_bounds=_pixel_bounds(component_mask),
                    boundary_wgs84=boundary_wgs84,
                )
            )

    measured_regions.sort(key=lambda region: region.area_square_metres, reverse=True)

    return measured_regions


def format_area(area_square_metres: float) -> str:
    if area_square_metres >= SQUARE_METRES_PER_SQUARE_KILOMETRE:
        return f"{area_square_metres / SQUARE_METRES_PER_SQUARE_KILOMETRE:.2f} km²"

    return f"{area_square_metres:,.0f} m²"


def format_perimeter(perimeter_metres: float) -> str:
    if perimeter_metres >= METRES_PER_KILOMETRE:
        return f"{perimeter_metres / METRES_PER_KILOMETRE:.2f} km"

    return f"{perimeter_metres:,.0f} m"


def format_centroid(longitude: float, latitude: float) -> str:
    latitude_hemisphere = "N" if latitude >= 0 else "S"
    longitude_hemisphere = "E" if longitude >= 0 else "W"

    return (
        f"{abs(latitude):.4f}{latitude_hemisphere} "
        f"{abs(longitude):.4f}{longitude_hemisphere}"
    )
