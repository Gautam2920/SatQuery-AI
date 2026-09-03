from dataclasses import dataclass

import torch


@dataclass
class GeoEvidence:
    source: str
    segmentation_logits: torch.Tensor | None = None
    segmentation_mask: torch.Tensor | None = None
    class_pixel_counts: dict[int, int] | None = None
    class_proportions: dict[int, float] | None = None
    confidence: float | None = None
    class_names: tuple[str, ...] = ()
