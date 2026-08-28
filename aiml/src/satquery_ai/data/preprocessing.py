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


def load_prithvi_tile(path: Path) -> torch.Tensor:
    with rasterio.open(path) as src:
        image = src.read()

    if image.shape[0] != 6:
        raise ValueError(f"Expected 6 bands, got {image.shape[0]}")

    if image.shape[1] < 224 or image.shape[2] < 224:
        raise ValueError(f"Image is too small: {image.shape[1:]}")

    image = image[:, :224, :224].astype(np.float32)

    mean = PRITHVI_MEAN[:, None, None]
    std = PRITHVI_STD[:, None, None]

    image = (image - mean) / std

    return torch.from_numpy(image)
