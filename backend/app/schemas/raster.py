from pydantic import BaseModel


class RasterBounds(BaseModel):
    left: float
    bottom: float
    right: float
    top: float


class RasterMetadata(BaseModel):
    width: int
    height: int
    band_count: int
    dtype: str
    crs: str | None
    bounds: RasterBounds
    transform: tuple[float, ...]
