from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SatelliteImage:
    image_path: Path
    bands: tuple[str, ...]
    width: int
    height: int
    ground_sample_distance: float | None = None


@dataclass(frozen=True)
class ImageTile:
    image: SatelliteImage
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class Prediction:
    label: str
    confidence: float
