import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import rasterio
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from satquery_ai.data.preprocessing import load_prithvi_tile
from satquery_ai.models.prithvi import PrithviModel


IMAGE_PATH = Path("aiml/data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")

OUTPUT_PATH = Path("aiml/data/processed/prithvi_prediction.png")


def main() -> None:
    with rasterio.open(IMAGE_PATH) as satellite_dataset:
        raw_satellite_data = satellite_dataset.read()

    satellite_tile = raw_satellite_data[:, :224, :224].astype(np.float32)

    preprocessed_tile = load_prithvi_tile(IMAGE_PATH)

    prithvi_model = PrithviModel()

    prediction_logits = prithvi_model.predict(preprocessed_tile.unsqueeze(0))

    prediction_mask = (
        torch.argmax(
            prediction_logits,
            dim=1,
        )[0]
        .cpu()
        .numpy()
    )

    rgb_image = np.stack(
        [
            satellite_tile[2],
            satellite_tile[1],
            satellite_tile[0],
        ],
        axis=-1,
    )

    lower_percentile = np.percentile(rgb_image, 2)
    upper_percentile = np.percentile(rgb_image, 98)

    rgb_image = np.clip(
        (rgb_image - lower_percentile) / (upper_percentile - lower_percentile),
        0,
        1,
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    figure, axes = plt.subplots(1, 3, figsize=(15, 5))

    axes[0].imshow(rgb_image)
    axes[0].set_title("Satellite Image")
    axes[0].axis("off")

    axes[1].imshow(prediction_mask)
    axes[1].set_title("Prediction")
    axes[1].axis("off")

    axes[2].imshow(rgb_image)
    axes[2].imshow(prediction_mask, alpha=0.45)
    axes[2].set_title("Overlay")
    axes[2].axis("off")

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=150)
    plt.close()

    print(f"Saved visualization to: {OUTPUT_PATH}")

    for class_id in np.unique(prediction_mask):
        class_pixel_count = np.sum(prediction_mask == class_id)
        class_percentage = (class_pixel_count / prediction_mask.size) * 100

        print(
            f"Class {class_id}: {class_pixel_count:,} pixels ({class_percentage:.2f}%)"
        )


if __name__ == "__main__":
    main()
