"""Rendering of the tile an analysis run covers.

Six-band HLS imagery renders as true colour. Fewer bands still deserve a real
preview - a single-band raster is rendered as greyscale - so that importing a
scene the model cannot analyse still shows the operator what they loaded.
"""

import io

import numpy as np
import rasterio
from PIL import Image as PillowImage

from satquery_ai.data.preprocessing import PRITHVI_IMAGE_SIZE

from backend.app.models.image import Image
from backend.app.services.raster_storage import resolve_storage_path


RED_BAND_INDEX = 2
GREEN_BAND_INDEX = 1
BLUE_BAND_INDEX = 0

CONTRAST_STRETCH_PERCENTILES = (2, 98)


class ScenePreviewError(Exception):
    pass


def render_analysed_tile_png(image: Image) -> bytes:
    if image.storage_key is None:
        raise ScenePreviewError("This image has no stored raster to preview.")

    try:
        raster_path = resolve_storage_path(image.storage_key)
    except FileNotFoundError as error:
        raise ScenePreviewError(str(error)) from error

    with rasterio.open(raster_path) as source:
        if source.count == 0:
            raise ScenePreviewError("This raster has no bands to preview.")

        tile = source.read()[
            :,
            :PRITHVI_IMAGE_SIZE,
            :PRITHVI_IMAGE_SIZE,
        ].astype(np.float32)

        nodata_value = source.nodata

    if nodata_value is not None:
        tile = np.where(tile == nodata_value, np.nan, tile)

    if tile.shape[0] > RED_BAND_INDEX:
        visible = np.stack(
            [tile[RED_BAND_INDEX], tile[GREEN_BAND_INDEX], tile[BLUE_BAND_INDEX]],
            axis=-1,
        )
    else:
        visible = np.repeat(tile[0][:, :, np.newaxis], 3, axis=2)

    if not np.any(np.isfinite(visible)):
        raise ScenePreviewError("This raster holds no valid pixels to render.")

    lower, upper = np.nanpercentile(visible, CONTRAST_STRETCH_PERCENTILES)

    if upper <= lower:
        raise ScenePreviewError("This raster has no contrast to render.")

    stretched = np.nan_to_num(
        np.clip((visible - lower) / (upper - lower), 0.0, 1.0),
        nan=0.0,
    )

    buffer = io.BytesIO()
    PillowImage.fromarray((stretched * 255).astype(np.uint8)).save(buffer, format="PNG")

    return buffer.getvalue()
