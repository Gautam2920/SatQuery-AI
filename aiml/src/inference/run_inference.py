import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from satquery_ai.data.preprocessing import load_prithvi_tile
from satquery_ai.models.prithvi import PrithviModel


IMAGE_PATH = Path("aiml/data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")


def main() -> None:
    print("Loading satellite image...")

    preprocessed_tile = load_prithvi_tile(IMAGE_PATH)

    print(f"Input shape: {tuple(preprocessed_tile.shape)}")
    print(f"Input dtype: {preprocessed_tile.dtype}")

    print("\nLoading Prithvi model...")

    prithvi_model = PrithviModel()

    print(f"Device: {prithvi_model.device}")

    preprocessed_tile = preprocessed_tile.unsqueeze(0)

    print("\nRunning inference...")

    prediction_logits = prithvi_model.predict(preprocessed_tile)

    print(f"Logits shape: {tuple(prediction_logits.shape)}")
    print(f"Logits dtype: {prediction_logits.dtype}")

    predicted_classes = torch.argmax(prediction_logits, dim=1)

    print(f"Prediction shape: {tuple(predicted_classes.shape)}")

    prediction_mask = predicted_classes[0]

    unique_classes, class_pixel_counts = torch.unique(
        prediction_mask,
        return_counts=True,
    )

    print("\nPredicted class distribution:")

    for class_id, pixel_count in zip(
        unique_classes.tolist(),
        class_pixel_counts.tolist(),
    ):
        class_percentage = (pixel_count / prediction_mask.numel()) * 100

        print(f"Class {class_id}: {pixel_count:,} pixels ({class_percentage:.2f}%)")


if __name__ == "__main__":
    main()
