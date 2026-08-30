from pathlib import Path

from satquery_ai.data.scene_loader import load_scene


def test_load_hls_scene():
    path = Path("aiml/data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")

    scene = load_scene(path)

    assert scene.sensor == "HLS"
    assert scene.raster.band_count == 6
    assert scene.raster.width == 560
    assert scene.raster.height == 448
    assert scene.raster.resolution == (30.0, 30.0)
