from pathlib import Path

import rasterio

from backend.app.geospatial.footprint import build_footprint
from backend.app.schemas.raster import RasterBounds, RasterMetadata


def _normalize_crs(crs) -> str | None:
    if crs is None:
        return None

    epsg = crs.to_epsg()

    if epsg is not None:
        return f"EPSG:{epsg}"

    crs_string = crs.to_string()

    if crs_string.startswith("EPSG:"):
        return crs_string

    raise ValueError(
        f"Unable to normalize raster CRS to an EPSG identifier: {crs_string}"
    )


def extract_raster_metadata(file_path: str | Path) -> RasterMetadata:
    file_path = Path(file_path)

    if not file_path.is_file():
        raise FileNotFoundError(f"Raster file not found: {file_path}")

    with rasterio.open(file_path) as src:
        crs = _normalize_crs(src.crs)

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
