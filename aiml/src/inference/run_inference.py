from pathlib import Path
import sys

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from satquery_ai.data.scene_loader import load_scene
from satquery_ai.perception.prithvi import PrithviPerception


IMAGE_PATH = Path("aiml/data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif")


def main() -> None:
    print("Loading satellite scene...")

    scene = load_scene(IMAGE_PATH)

    print(f"Sensor: {scene.sensor}")
    print(f"Size: {scene.raster.width} x {scene.raster.height}")
    print(f"Bands: {scene.raster.band_count}")
    print(f"Resolution: {scene.raster.resolution}")
    print(f"CRS: {scene.raster.crs}")

    print("\nLoading Prithvi perception model...")

    perception = PrithviPerception()

    print(f"Device: {perception.model.device}")

    print("\nRunning perception...")

    evidence = perception.analyze(IMAGE_PATH)

    print(f"Segmentation logits shape: {tuple(evidence.segmentation_logits.shape)}")

    print(f"Segmentation mask shape: {tuple(evidence.segmentation_mask.shape)}")

    classes, counts = torch.unique(
        evidence.segmentation_mask,
        return_counts=True,
    )

    print("\nDiagnostic class distribution:")

    total = evidence.segmentation_mask.numel()

    for class_id, count in zip(classes.tolist(), counts.tolist()):
        percentage = count / total * 100
        print(f"Class {class_id}: {count:,} pixels ({percentage:.2f}%)")


if __name__ == "__main__":
    main()
