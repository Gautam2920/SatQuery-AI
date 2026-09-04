import pytest

from satquery_ai.data.compatibility import (
    PRITHVI_INPUT,
    describe_band_mismatch,
    describe_size_shortfall,
)


def test_the_contract_matches_the_pretrained_checkpoint():
    assert PRITHVI_INPUT.band_count == 6
    assert PRITHVI_INPUT.minimum_side_pixels == 224
    assert PRITHVI_INPUT.band_summary == "B02 B03 B04 B8A B11 B12"


def test_six_bands_are_accepted():
    assert describe_band_mismatch(6) is None


@pytest.mark.parametrize("band_count", [1, 3, 4, 10, 13])
def test_any_other_band_count_is_named_in_the_refusal(band_count):
    reason = describe_band_mismatch(band_count)

    assert reason is not None
    assert str(band_count) in reason
    assert "B02 B03 B04 B8A B11 B12" in reason


@pytest.mark.parametrize("width, height", [(224, 224), (256, 256), (560, 448)])
def test_a_tile_at_or_above_the_minimum_is_accepted(width, height):
    assert describe_size_shortfall(width, height) is None


@pytest.mark.parametrize("width, height", [(120, 120), (223, 224), (224, 223), (20, 20)])
def test_an_undersized_tile_is_refused_rather_than_enlarged(width, height):
    reason = describe_size_shortfall(width, height)

    assert reason is not None
    assert f"{width}x{height}" in reason
    # the refusal has to say why enlarging is not the answer
    assert "invent" in reason
