from pathlib import Path

from satquery_ai.data.types import ImageTile, SatelliteImage


def test_satellite_image():
    image = SatelliteImage(
        image_path=Path("sample.tif"),
        bands=("red", "green", "blue"),
        width=256,
        height=256,
    )

    assert image.width == 256
    assert image.height == 256
    assert image.bands == ("red", "green", "blue")


def test_image_tile():
    image = SatelliteImage(
        image_path=Path("sample.tif"),
        bands=("red", "green", "blue"),
        width=1024,
        height=1024,
    )

    tile = ImageTile(
        image=image,
        x=0,
        y=0,
        width=256,
        height=256,
    )

    assert tile.width == 256
    assert tile.height == 256
    assert tile.image == image
