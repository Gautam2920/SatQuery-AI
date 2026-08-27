from pathlib import Path

import rasterio
from shapely.geometry import box


def extract_raster_metadata(file_path: str | Path) -> dict:
    file_path = Path(file_path)

    if not file_path.is_file():
        raise FileNotFoundError(f"Raster file not found: {file_path}")

    with rasterio.open(file_path) as src:
        crs = None

        if src.crs is not None:
            epsg = src.crs.to_epsg()

            if epsg is not None:
                crs = f"EPSG:{epsg}"
            else:
                crs = src.crs.to_string()

        bounds = src.bounds

        footprint = box(
            bounds.left,
            bounds.bottom,
            bounds.right,
            bounds.top,
        )

        return {
            "width": src.width,
            "height": src.height,
            "band_count": src.count,
            "dtype": src.dtypes[0],
            "crs": crs,
            "bounds": {
                "left": bounds.left,
                "bottom": bounds.bottom,
                "right": bounds.right,
                "top": bounds.top,
            },
            "footprint": footprint.wkt,
            "transform": tuple(src.transform),
        }
