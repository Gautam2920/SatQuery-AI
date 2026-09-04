"""What the Prithvi pipeline can actually consume.

The encoder was pretrained on six HLS surface-reflectance bands over a 224x224
tile, so these are properties of the checkpoint rather than of any one caller.
Callers check a scene against them before spending an upload, a preview or an
inference on imagery the model cannot read.

A raster that falls short is refused rather than resized or padded: interpolating
an undersized scene up to 224x224 would invent spatial detail the sensor never
recorded, and the model would then report measurements over invented pixels.
"""

from dataclasses import dataclass

from satquery_ai.data.preprocessing import PRITHVI_IMAGE_SIZE, PRITHVI_NUM_BANDS


HLS_BAND_IDENTIFIERS = ("B02", "B03", "B04", "B8A", "B11", "B12")


@dataclass(frozen=True)
class ModelInputContract:
    band_count: int
    minimum_side_pixels: int
    band_identifiers: tuple[str, ...]

    @property
    def band_summary(self) -> str:
        return " ".join(self.band_identifiers)


PRITHVI_INPUT = ModelInputContract(
    band_count=PRITHVI_NUM_BANDS,
    minimum_side_pixels=PRITHVI_IMAGE_SIZE,
    band_identifiers=HLS_BAND_IDENTIFIERS,
)


def describe_band_mismatch(band_count: int) -> str | None:
    if band_count == PRITHVI_INPUT.band_count:
        return None

    return (
        f"Prithvi reads {PRITHVI_INPUT.band_count} HLS bands "
        f"({PRITHVI_INPUT.band_summary}); this raster has {band_count}."
    )


def describe_size_shortfall(width: int, height: int) -> str | None:
    minimum = PRITHVI_INPUT.minimum_side_pixels

    if width >= minimum and height >= minimum:
        return None

    return (
        f"Prithvi reads a {minimum}x{minimum} pixel tile; this raster is "
        f"{width}x{height}. Enlarging it would invent detail the sensor did not "
        "record, so it is refused instead."
    )
