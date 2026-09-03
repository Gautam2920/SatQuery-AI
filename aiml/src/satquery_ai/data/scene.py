from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from rasterio.crs import CRS
from rasterio.coords import BoundingBox


@dataclass(frozen=True)
class RasterInfo:
    path: Path
    width: int
    height: int
    band_count: int
    dtype: str
    crs: CRS | None
    bounds: BoundingBox
    resolution: tuple[float, float]
    transform: object


@dataclass(frozen=True)
class SatelliteScene:
    raster: RasterInfo
    sensor: str
    bands: tuple[str, ...]
    acquisition_time: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
