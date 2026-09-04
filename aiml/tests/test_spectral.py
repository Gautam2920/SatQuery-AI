import numpy as np
import pytest

from satquery_ai.perception.spectral import (
    BUILT_UP_OR_BARE,
    DENSE_VEGETATION,
    SPARSE_VEGETATION,
    WATER,
    classify_land_cover,
    compute_spectral_indices,
)


def build_bands(blue, green, red, nir, swir1, swir2):
    return np.array(
        [[[blue]], [[green]], [[red]], [[nir]], [[swir1]], [[swir2]]],
        dtype=np.float32,
    )


def test_rejects_wrong_band_count():
    with pytest.raises(ValueError):
        compute_spectral_indices(np.zeros((3, 4, 4), dtype=np.float32))


def test_zero_reflectance_yields_finite_indices():
    indices = compute_spectral_indices(np.zeros((6, 4, 4), dtype=np.float32))

    assert np.isfinite(indices.ndwi).all()
    assert np.isfinite(indices.ndvi).all()
    assert np.isfinite(indices.ndbi).all()


@pytest.mark.parametrize(
    "bands, expected",
    [
        (build_bands(300, 900, 400, 200, 150, 120), WATER),
        (build_bands(300, 400, 300, 3000, 1200, 800), DENSE_VEGETATION),
        (build_bands(300, 400, 800, 1200, 900, 700), SPARSE_VEGETATION),
        (build_bands(600, 800, 1400, 1500, 2200, 2000), BUILT_UP_OR_BARE),
    ],
)
def test_land_cover_classification(bands, expected):
    labels = classify_land_cover(compute_spectral_indices(bands))

    assert labels[0, 0] == expected
