from pathlib import Path

import torch

from satquery_ai.data.preprocessing import load_prithvi_tile


IMAGE_PATH = Path("aiml/data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")


def test_prithvi_preprocessing_contract():
    tensor = load_prithvi_tile(IMAGE_PATH)

    assert tensor.shape == (6, 224, 224)
    assert tensor.dtype == torch.float32
    assert torch.isfinite(tensor).all()
