from pathlib import Path

import numpy as np
import rasterio
import torch


PRITHVI_MEAN = np.array(
    [1087.0, 1342.0, 1433.0, 2734.0, 1958.0, 1363.0],
    dtype=np.float32,
)

PRITHVI_STD = np.array(
    [2248.0, 2179.0, 2178.0, 1850.0, 1242.0, 1049.0],
    dtype=np.float32,
)

PRITHVI_NUM_BANDS = 6
PRITHVI_IMAGE_SIZE = 224


def load_prithvi_tile(path: Path) -> torch.Tensor:
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"Satellite image not found: {path}")

    with rasterio.open(path) as source:
        image = source.read()

    if image.ndim != 3:
        raise ValueError(f"Expected 3D image data, got shape {image.shape}")

    if image.shape[0] != PRITHVI_NUM_BANDS:
        raise ValueError(f"Expected {PRITHVI_NUM_BANDS} bands, got {image.shape[0]}")

    height, width = image.shape[1:]

    if height < PRITHVI_IMAGE_SIZE or width < PRITHVI_IMAGE_SIZE:
        raise ValueError(
            f"Image is too small: {height}x{width}. "
            f"Minimum required size is "
            f"{PRITHVI_IMAGE_SIZE}x{PRITHVI_IMAGE_SIZE}"
        )

    image = image[
        :,
        :PRITHVI_IMAGE_SIZE,
        :PRITHVI_IMAGE_SIZE,
    ].astype(np.float32, copy=False)

    mean = PRITHVI_MEAN[:, None, None]
    std = PRITHVI_STD[:, None, None]

    normalized_image = (image - mean) / std

    return torch.from_numpy(normalized_image)
