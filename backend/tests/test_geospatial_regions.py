import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

from backend.app.geospatial.regions import (
    format_area,
    format_centroid,
    format_perimeter,
    measure_labelled_regions,
)


PIXEL_SIZE_METRES = 30
TILE_SIZE = 32


@pytest.fixture
def utm_raster(tmp_path):
    """A 32x32 UTM 13N raster so measured areas have a known ground truth."""
    path = tmp_path / "synthetic.tif"

    profile = {
        "driver": "GTiff",
        "width": TILE_SIZE,
        "height": TILE_SIZE,
        "count": 1,
        "dtype": "uint16",
        "crs": "EPSG:32613",
        "transform": from_origin(400_000, 3_180_000, PIXEL_SIZE_METRES, PIXEL_SIZE_METRES),
    }

    with rasterio.open(path, "w", **profile) as destination:
        destination.write(np.zeros((1, TILE_SIZE, TILE_SIZE), dtype=np.uint16))

    return path


def test_measures_area_from_the_raster_transform(utm_raster):
    label_grid = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.int64)
    label_grid[0:8, 0:8] = 1

    regions = measure_labelled_regions(utm_raster, label_grid, minimum_pixel_count=1)

    square = next(region for region in regions if region.region_index == 1)

    assert square.pixel_count == 64
    assert square.area_square_metres == pytest.approx(64 * PIXEL_SIZE_METRES**2)
    assert square.perimeter_metres == pytest.approx(4 * 8 * PIXEL_SIZE_METRES)
    assert square.pixel_bounds == (0, 0, 8, 8)


def test_splits_a_label_into_connected_components(utm_raster):
    label_grid = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.int64)
    label_grid[0:4, 0:4] = 1
    label_grid[20:24, 20:24] = 1

    regions = measure_labelled_regions(utm_raster, label_grid, minimum_pixel_count=1)

    components = [region for region in regions if region.region_index == 1]

    assert len(components) == 2


def test_discards_components_below_the_minimum_size(utm_raster):
    label_grid = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.int64)
    label_grid[0:8, 0:8] = 1
    label_grid[20:22, 20:21] = 1

    regions = measure_labelled_regions(utm_raster, label_grid, minimum_pixel_count=16)

    assert [region.pixel_count for region in regions if region.region_index == 1] == [64]


def test_centroid_is_reprojected_to_wgs84(utm_raster):
    label_grid = np.ones((TILE_SIZE, TILE_SIZE), dtype=np.int64)

    region = measure_labelled_regions(utm_raster, label_grid, minimum_pixel_count=1)[0]

    assert -180 <= region.centroid_longitude <= 180
    assert -90 <= region.centroid_latitude <= 90
    assert region.centroid_longitude == pytest.approx(-106.0, abs=0.5)
    assert region.centroid_latitude == pytest.approx(28.7, abs=0.5)


def test_regions_are_ordered_by_descending_area(utm_raster):
    label_grid = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.int64)
    label_grid[0:4, 0:4] = 1
    label_grid[10:20, 10:20] = 2

    areas = [
        region.area_square_metres
        for region in measure_labelled_regions(
            utm_raster,
            label_grid,
            minimum_pixel_count=1,
        )
    ]

    assert areas == sorted(areas, reverse=True)


def test_rejects_a_raster_without_a_crs(tmp_path):
    path = tmp_path / "no_crs.tif"

    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=4,
        height=4,
        count=1,
        dtype="uint8",
    ) as destination:
        destination.write(np.zeros((1, 4, 4), dtype=np.uint8))

    with pytest.raises(ValueError, match="no CRS"):
        measure_labelled_regions(path, np.ones((4, 4), dtype=np.int64), 1)


def test_measurement_formatting():
    assert format_area(2_500_000) == "2.50 km²"
    assert format_area(4_500) == "4,500 m²"
    assert format_perimeter(1_500) == "1.50 km"
    assert format_perimeter(240) == "240 m"
    assert format_centroid(-104.77, 28.75) == "28.7500N 104.7700W"
    assert format_centroid(77.1, -28.0) == "28.0000S 77.1000E"
