from pathlib import Path

import rasterio

from backend.app.geospatial.footprint import build_footprint
from backend.app.schemas.raster import RasterBounds, RasterMetadata


def extract_raster_metadata(file_path: str | Path) -> RasterMetadata:
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

        bounds = RasterBounds(
            left=src.bounds.left,
            bottom=src.bounds.bottom,
            right=src.bounds.right,
            top=src.bounds.top,
        )

        return RasterMetadata(
            width=src.width,
            height=src.height,
            band_count=src.count,
            dtype=src.dtypes[0],
            crs=crs,
            bounds=bounds,
            transform=tuple(src.transform),
        )


def extract_raster_footprint(file_path: str | Path):
    metadata = extract_raster_metadata(file_path)

    return build_footprint(metadata.bounds)
