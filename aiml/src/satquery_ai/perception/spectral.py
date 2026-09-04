"""Deterministic spectral characterisation of Prithvi HLS tiles.

SatQuery's governing principle is that the model interprets and deterministic
software measures. The Prithvi encoder decides *where* the coherent regions are;
the indices here decide *what* each region is, from published band arithmetic
rather than from a learned classifier head.
"""

from dataclasses import dataclass

import numpy as np


PRITHVI_BAND_ORDER = ("blue", "green", "red", "nir", "swir1", "swir2")

WATER_NDWI_THRESHOLD = 0.0
DENSE_VEGETATION_NDVI_THRESHOLD = 0.4
SPARSE_VEGETATION_NDVI_THRESHOLD = 0.2
BUILT_UP_NDBI_THRESHOLD = 0.0

WATER = "water"
DENSE_VEGETATION = "dense vegetation"
SPARSE_VEGETATION = "sparse vegetation"
BUILT_UP_OR_BARE = "built-up or bare ground"
UNVEGETATED_SURFACE = "unvegetated surface"


@dataclass(frozen=True)
class SpectralIndices:
    ndwi: np.ndarray
    ndvi: np.ndarray
    ndbi: np.ndarray


def _normalized_difference(first: np.ndarray, second: np.ndarray) -> np.ndarray:
    total = first + second

    return np.divide(
        first - second,
        total,
        out=np.zeros_like(total, dtype=np.float32),
        where=total != 0,
    )


def compute_spectral_indices(bands: np.ndarray) -> SpectralIndices:
    if bands.shape[0] != len(PRITHVI_BAND_ORDER):
        raise ValueError(
            f"Expected {len(PRITHVI_BAND_ORDER)} bands in order "
            f"{PRITHVI_BAND_ORDER}, got {bands.shape[0]}"
        )

    reflectance = bands.astype(np.float32, copy=False)
    _, green, red, nir, swir1, _ = reflectance

    return SpectralIndices(
        ndwi=_normalized_difference(green, nir),
        ndvi=_normalized_difference(nir, red),
        ndbi=_normalized_difference(swir1, nir),
    )


def classify_land_cover(indices: SpectralIndices) -> np.ndarray:
    """Per-pixel land-cover label from index thresholds, evaluated in priority order."""
    labels = np.full(indices.ndvi.shape, UNVEGETATED_SURFACE, dtype=object)

    labels[indices.ndbi > BUILT_UP_NDBI_THRESHOLD] = BUILT_UP_OR_BARE
    labels[indices.ndvi >= SPARSE_VEGETATION_NDVI_THRESHOLD] = SPARSE_VEGETATION
    labels[indices.ndvi >= DENSE_VEGETATION_NDVI_THRESHOLD] = DENSE_VEGETATION
    labels[indices.ndwi > WATER_NDWI_THRESHOLD] = WATER

    return labels
