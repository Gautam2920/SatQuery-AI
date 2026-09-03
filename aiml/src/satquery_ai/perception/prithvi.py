from pathlib import Path

import torch

from satquery_ai.data.preprocessing import load_prithvi_tile
from satquery_ai.perception.evidence import GeoEvidence
from satquery_ai.models.prithvi import PrithviModel


class PrithviPerception:
    def __init__(
        self,
        num_classes: int = 2,
        device: torch.device | None = None,
    ) -> None:
        self.model = PrithviModel(
            num_classes=num_classes,
            device=device,
        )

    @torch.inference_mode()
    def analyze(self, path: Path) -> GeoEvidence:
        image = load_prithvi_tile(path)
        batch = image.unsqueeze(0)

        logits = self.model.predict(batch)
        mask = torch.argmax(logits, dim=1)[0]

        unique_classes, pixel_counts = torch.unique(
            mask,
            return_counts=True,
        )

        total_pixels = mask.numel()

        class_pixel_counts = {
            int(class_id): int(count)
            for class_id, count in zip(
                unique_classes,
                pixel_counts,
            )
        }

        class_proportions = {
            class_id: count / total_pixels
            for class_id, count in class_pixel_counts.items()
        }

        probabilities = torch.softmax(logits, dim=1)
        confidence = float(probabilities.max(dim=1).values.mean().item())

        return GeoEvidence(
            source="prithvi",
            segmentation_logits=logits[0].detach().cpu(),
            segmentation_mask=mask.detach().cpu(),
            class_pixel_counts=class_pixel_counts,
            class_proportions=class_proportions,
            confidence=confidence,
        )
