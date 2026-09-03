import torch
from terratorch.models import EncoderDecoderFactory

from satquery_ai.models.base import SatelliteModel


class PrithviModel(SatelliteModel):
    def __init__(
        self,
        num_classes: int = 2,
        device: torch.device | None = None,
    ) -> None:
        self.device = device or torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.model = EncoderDecoderFactory().build_model(
            task="segmentation",
            backbone="terratorch_prithvi_eo_v2_tiny_tl",
            decoder="FCNDecoder",
            backbone_kwargs={"pretrained": True},
            num_classes=num_classes,
        )

        self.model = self.model.to(self.device)
        self.model.eval()

    @torch.inference_mode()
    def predict(self, image: torch.Tensor) -> torch.Tensor:
        image = image.to(self.device)

        output = self.model(image)

        return output.output
