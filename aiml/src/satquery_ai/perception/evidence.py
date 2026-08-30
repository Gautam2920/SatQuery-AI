from dataclasses import dataclass

import torch


@dataclass
class GeoEvidence:
    source: str
    feature_map: torch.Tensor | None = None
    segmentation_logits: torch.Tensor | None = None
    segmentation_mask: torch.Tensor | None = None
    class_names: tuple[str, ...] = ()
    confidence: float | None = None
