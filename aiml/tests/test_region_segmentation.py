from pathlib import Path

import numpy as np
import pytest

from satquery_ai.perception.region_segmentation import (
    SEGMENTATION_SOURCE,
    PrithviRegionSegmenter,
)


IMAGE_PATH = Path("data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")

REGION_COUNT = 4


@pytest.fixture(scope="module")
def segmentation():
    return PrithviRegionSegmenter().segment(IMAGE_PATH, region_count=REGION_COUNT)


def test_segmentation_contract(segmentation):
    assert segmentation.source == SEGMENTATION_SOURCE
    assert segmentation.patch_grid == (14, 14)
    assert segmentation.patch_size == 16
    assert segmentation.embedding_dim == 192
    assert segmentation.tile_size == 224

    assert segmentation.label_grid.shape == (224, 224)
    assert set(np.unique(segmentation.label_grid)) <= set(range(REGION_COUNT))


def test_regions_partition_the_tile(segmentation):
    assert 0 < len(segmentation.regions) <= REGION_COUNT

    total_pixels = sum(region.pixel_count for region in segmentation.regions)

    assert total_pixels == 224 * 224


def test_region_measurements_are_meaningful(segmentation):
    for region in segmentation.regions:
        assert region.pixel_count > 0
        assert 0.0 < region.label_agreement <= 1.0
        assert -1.0 <= region.mean_ndwi <= 1.0
        assert -1.0 <= region.mean_ndvi <= 1.0
        assert -1.0 <= region.mean_ndbi <= 1.0


def test_regions_are_spectrally_distinct(segmentation):
    """The pretrained encoder must separate land cover, not partition arbitrarily."""
    vegetation_vigour = [region.mean_ndvi for region in segmentation.regions]

    assert max(vegetation_vigour) - min(vegetation_vigour) > 0.05


def test_segmentation_is_reproducible():
    segmenter = PrithviRegionSegmenter()

    first = segmenter.segment(IMAGE_PATH, region_count=REGION_COUNT)
    second = segmenter.segment(IMAGE_PATH, region_count=REGION_COUNT)

    assert np.array_equal(first.label_grid, second.label_grid)


def test_rejects_out_of_range_region_count(segmentation):
    with pytest.raises(ValueError):
        PrithviRegionSegmenter().segment(IMAGE_PATH, region_count=1)
