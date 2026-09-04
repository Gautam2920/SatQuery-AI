# SatQuery AI — AI/ML

The `satquery_ai` package: everything that reads satellite rasters and runs a
model over them. It exposes a small, plain-Python surface that the backend
imports in-process — there is no model server and no HTTP layer here.

## Purpose

Turn a GeoTIFF scene into **region labels in pixel space**, plus the spectral
evidence that justifies each label. Converting those regions into geographic
measurements (polygons, area, coordinates) is deliberately *not* done here — that
belongs to the backend's geospatial layer, which owns the CRS.

## The Prithvi pipeline

The baseline model is **Prithvi EO V2 Tiny (TL)**, built through TerraTorch's
`EncoderDecoderFactory` and loaded from the HuggingFace cache
(`ibm-nasa-geospatial/Prithvi-EO-2.0-tiny-TL`).

> **Only the backbone is pretrained.** The `FCNDecoder` and head that
> `EncoderDecoderFactory` builds are randomly initialised, and the team has not
> trained them. Two builds of the same model disagree on roughly half the pixels
> for identical input, so **`PrithviPerception` class labels and confidence are
> not meaningful** and nothing user-facing may present them as results.
> `PrithviModel.predict()` and `PrithviPerception` are kept as the interface a
> future fine-tuned head will slot into.

`PrithviRegionSegmenter` is the path that is genuinely usable today, because it
consumes only the pretrained encoder:

```
GeoTIFF
  ↓  load_prithvi_tile         6 bands, top-left 224×224, per-band normalisation
  ↓  PrithviModel.encode_patches   ViT patch embeddings, averaged over all 12 layers
  ↓  k-means                    coherent regions over a 14×14 patch grid
  ↓  upsample                   224×224 label grid
  ↓  spectral indices           NDWI / NDVI / NDBI per pixel
  ↓  dominant label per region  + the share of pixels that agree with it
RegionSegmentation
```

Averaging all twelve encoder layers rather than taking the last one measurably
improves both the spatial coherence of the clusters and their land-cover
separation, which is why `encode_patches` does that.

### Why the labels are trustworthy

The model decides *which pixels belong together*. What each region **is** comes
from published band arithmetic in `perception/spectral.py`, evaluated in priority
order:

| Condition | Label |
|---|---|
| `NDWI > 0.0` | water |
| `NDVI ≥ 0.4` | dense vegetation |
| `NDVI ≥ 0.2` | sparse vegetation |
| `NDBI > 0.0` | built-up or bare ground |
| otherwise | unvegetated surface |

A region's confidence is `label_agreement` — the fraction of its pixels that
satisfy the assigned label. It is a measured quantity, not a model output.

## Data and scene handling

- `data/scene_loader.py` — `load_scene()` reads raster metadata into a frozen
  `SatelliteScene` (size, band count, dtype, CRS, bounds, resolution, transform)
  and infers the sensor from the filename (`HLS`, `SENTINEL-2`, else
  `UNKNOWN-<n>BAND`).
- `data/preprocessing.py` — `load_prithvi_tile()` validates that the raster has
  exactly **6 bands** and is at least **224×224**, crops the top-left
  224×224 window, and normalises with the Prithvi mean/std constants. Band order
  is **blue, green, red, NIR, SWIR1, SWIR2** (HLS/Sentinel-2 B02 B03 B04 B8A B11 B12).
- `data/types.py` — `SatelliteImage`, `ImageTile`, `Prediction` dataclasses.
  Currently declarations only; nothing in the pipeline consumes them yet.

## Perception / evidence

Two result shapes, for the two paths above:

- `GeoEvidence` (`perception/evidence.py`) — segmentation logits, mask, per-class
  pixel counts and proportions. Produced by `PrithviPerception`; see the warning
  above before using it.
- `RegionSegmentation` / `SceneRegion` (`perception/region_segmentation.py`) — the
  224×224 label grid, per-region land cover, pixel count, label agreement and mean
  NDWI/NDVI/NDBI, plus tile-wide land-cover fractions. This is what the backend consumes.

## Structure

```
src/satquery_ai/
  device.py               get_device() — cuda when available
  data/
    preprocessing.py      load_prithvi_tile, PRITHVI_MEAN/STD, band + size validation
    scene.py              RasterInfo, SatelliteScene
    scene_loader.py       load_scene, infer_sensor
    types.py              placeholder dataclasses (unused)
  models/
    base.py               SatelliteModel ABC — predict()
    prithvi.py            PrithviModel — predict(), encode_patches()
  perception/
    evidence.py           GeoEvidence
    prithvi.py            PrithviPerception  (untrained head — see warning)
    spectral.py           spectral indices + land-cover thresholds
    region_segmentation.py PrithviRegionSegmenter, RegionSegmentation, SceneRegion
src/inference/            standalone diagnostic scripts (not imported by the backend)
src/training/             empty placeholder package
src/evaluation/           empty placeholder package
scripts/verify_patch.py   BigEarthNet patch cross-check (needs datasets not in the repo)
tests/
```

## Environment

Use the repository's single working environment, **`backend/.venv`**. It already
contains torch 2.13.0+cu126, terratorch, timm, torchgeo, rasterio and scikit-learn,
plus an editable install of this package. `aiml/.venv` exists but is empty — do not
use it.

`requirements.txt` lists this subsystem's direct dependencies for the record; it is
not what the working environment was built from.

## Running

Model weights download to the HuggingFace cache on first use. Commands run from
`aiml/`, because the scripts and tests use paths relative to it.

```bash
# tests (19)
../backend/.venv/Scripts/python.exe -m pytest tests -q

# diagnostic inference — prints scene metadata and the class distribution
../backend/.venv/Scripts/python.exe src/inference/run_inference.py

# writes a scene / prediction / overlay figure to data/processed/
../backend/.venv/Scripts/python.exe src/inference/visualize_prediction.py
```

Both scripts in `src/inference/` hardcode a path under `aiml/data/raw/` and expect
to be launched from the repository root. They are diagnostics from the model
bring-up work, kept for reference; the backend does not use them.

### Test data

Tests and scripts need
`data/raw/Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif`. `aiml/data/` is
gitignored, so fetch it (and the July scene used for the seasonal comparison) from
the public Prithvi examples:

```python
from huggingface_hub import hf_hub_download
import shutil, pathlib

pathlib.Path("data/raw").mkdir(parents=True, exist_ok=True)
for name in [
    "Mexico_HLS.S30.T13REM.2018026T173609.v2.0_cropped.tif",
    "Mexico_HLS.S30.T13REM.2018201T172901.v2.0_cropped.tif",
]:
    shutil.copy(
        hf_hub_download("ibm-nasa-geospatial/Prithvi-EO-2.0-300M", f"examples/{name}"),
        f"data/raw/{name}",
    )
```

Without it, three tests fail with `FileNotFoundError`. That is missing data, not a
code defect.

`scripts/verify_patch.py` additionally needs a BigEarthNet metadata parquet, a QA
parquet and Kaggle Sentinel-2 band files that are not present in this repository.

## Backend integration boundary

The backend imports this package directly — same process, no serialisation:

```python
from satquery_ai.perception.region_segmentation import PrithviRegionSegmenter

segmentation = PrithviRegionSegmenter().segment(raster_path, region_count=4)
```

The contract is deliberately narrow:

- **This package returns** a pixel-space label grid and per-region spectral evidence.
- **The backend does** every geographic conversion — polygonisation, area,
  perimeter, centroid reprojection — from the raster's own transform and CRS.
- Constructing `PrithviRegionSegmenter` costs roughly fifteen seconds (mostly the
  terratorch import), so the backend holds one instance per process and reuses it.
  Segmentation itself is well under a second on GPU.

## Implementation status

**Working**
- Scene loading and raster metadata extraction
- Prithvi preprocessing with band/size validation
- Prithvi model build and inference on CUDA
- Pretrained-encoder patch embeddings
- Region segmentation with deterministic spectral labelling
- 19 tests passing

**Not done**
- No fine-tuning or domain adaptation — the segmentation head is untrained, which
  is the single largest gap against the SIH requirement
- No evaluation harness (`src/evaluation/` is empty)
- No training code (`src/training/` is empty)
- Only the top-left 224×224 window of a scene is analysed; no tiling over full rasters
- Single-scene only — no bi-temporal or SAR/optical paths
- No VQA or language model component
