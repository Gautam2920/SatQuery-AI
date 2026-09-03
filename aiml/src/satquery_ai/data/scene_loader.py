from pathlib import Path

import rasterio

from satquery_ai.data.scene import RasterInfo, SatelliteScene


def infer_sensor(path: Path, band_count: int) -> str:
    name = path.name.upper()

    if "HLS" in name:
        return "HLS"

    if "MSIL2A" in name or "S2A" in name or "S2B" in name:
        return "SENTINEL-2"

    return f"UNKNOWN-{band_count}BAND"


def load_scene(path: Path) -> SatelliteScene:
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(path)

    with rasterio.open(path) as src:
        raster = RasterInfo(
            path=path,
            width=src.width,
            height=src.height,
            band_count=src.count,
            dtype=src.dtypes[0],
            crs=src.crs,
            bounds=src.bounds,
            resolution=src.res,
            transform=src.transform,
        )

    sensor = infer_sensor(path, raster.band_count)

    return SatelliteScene(
        raster=raster,
        sensor=sensor,
        bands=tuple(f"B{i}" for i in range(1, raster.band_count + 1)),
    )
