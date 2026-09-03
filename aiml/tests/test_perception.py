from pathlib import Path

import torch

from satquery_ai.perception.prithvi import PrithviPerception


IMAGE_PATH = Path("data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")


def test_prithvi_perception_contract():
    perception = PrithviPerception()

    evidence = perception.analyze(IMAGE_PATH)

    assert evidence.source == "prithvi"
    assert evidence.segmentation_logits is not None
    assert evidence.segmentation_mask is not None
    assert evidence.class_pixel_counts is not None
    assert evidence.class_proportions is not None
    assert evidence.confidence is not None

    assert evidence.segmentation_mask.ndim == 2
    assert evidence.segmentation_mask.shape == (224, 224)

    assert all(isinstance(class_id, int) for class_id in evidence.class_pixel_counts)

    assert sum(evidence.class_pixel_counts.values()) == 224 * 224

    assert abs(sum(evidence.class_proportions.values()) - 1.0) < 1e-6

    assert 0.0 <= evidence.confidence <= 1.0

    assert torch.isfinite(evidence.segmentation_logits).all()
    assert torch.isfinite(evidence.segmentation_mask.float()).all()
