from pathlib import Path
import glob
import os

import pandas as pd
import rasterio


PATCH_ID = "S2A_MSIL2A_20171104T095201_N9999_R079_T33TXN_00_00"

BAND_DIR = Path("aiml/data/raw/kaggle_test")
METADATA_PATH = Path("aiml/data/metadata/metadata.parquet")
QA_PATH = Path("BigEarthNet.txt/BigEarthNet.txt.parquet")


def band_name(path):
    return Path(path).stem.split("_")[-1]


print("=" * 70)
print("BIGEARTHNET PATCH VERIFICATION")
print("=" * 70)

print(f"\nPatch ID: {PATCH_ID}")


metadata = pd.read_parquet(METADATA_PATH)

metadata_match = metadata[metadata["patch_id"] == PATCH_ID]

if metadata_match.empty:
    print("\n[ERROR] Patch not found in metadata.parquet")
    raise SystemExit(1)

meta = metadata_match.iloc[0]

print("\n--- Metadata ---")
print(f"Split                  : {meta['split']}")
print(f"Country                : {meta['country']}")
print(f"Labels                 : {meta['labels']}")
print(f"Seasonal snow          : {meta['contains_seasonal_snow']}")
print(f"Cloud/shadow           : {meta['contains_cloud_or_shadow']}")
print(f"S1 name                : {meta['s1_name']}")
print(f"S2 name                : {meta['s2v1_name']}")


print("\n--- Sentinel-2 Bands ---")

band_files = sorted(BAND_DIR.glob(f"{PATCH_ID}_*.tif"))

expected_bands = {
    "B01",
    "B02",
    "B03",
    "B04",
    "B05",
    "B06",
    "B07",
    "B08",
    "B8A",
    "B09",
    "B11",
    "B12",
}

found_bands = set()

for path in band_files:
    b = band_name(path)
    found_bands.add(b)

    with rasterio.open(path) as src:
        print(
            f"{b:4} | "
            f"shape={src.shape!s:12} | "
            f"resolution={src.res[0]:5.1f}m | "
            f"dtype={src.dtypes[0]:7} | "
            f"bounds={src.bounds}"
        )

missing = expected_bands - found_bands
extra = found_bands - expected_bands

print(f"\nBands found: {len(found_bands)}/{len(expected_bands)}")
if missing:
    print(f"Missing bands: {sorted(missing)}")

if extra:
    print(f"Unexpected bands: {sorted(extra)}")


print("\n--- QA Dataset ---")
qa = pd.read_parquet(QA_PATH)

qa_match = qa[qa["patch_id"] == PATCH_ID]

print(f"QA records: {len(qa_match)}")
if qa_match.empty:
    print("[ERROR] Patch not found in QA dataset.")
    raise SystemExit(1)

print("\nQuestion types:")
for question_type, count in qa_match["type"].value_counts().items():
    print(f"  {question_type:12}: {count}")


print("\n--- Ground Truth ---")
for _, row in qa_match.iterrows():
    print(f"\n[{row['type']} / {row['category']}]")
    print(f"Q: {row['input']}")
    print(f"A: {row['output']}")


print("\n" + "=" * 70)
metadata_ok = len(metadata_match) == 1
bands_ok = found_bands == expected_bands
qa_ok = len(qa_match) == 14

if metadata_ok and bands_ok and qa_ok:
    print("STATUS: VERIFIED")
    print()
    print("The patch exists consistently across:")
    print("  [OK] metadata.parquet")
    print("  [OK] Kaggle Sentinel-2 imagery")
    print("  [OK] BigEarthNet QA dataset")
else:
    print("STATUS: CHECK REQUIRED")

print("=" * 70)
