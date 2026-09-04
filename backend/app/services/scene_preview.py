"""True-colour rendering of the tile an analysis run covers."""

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
        if source.count <= RED_BAND_INDEX:
            raise ScenePreviewError(
                f"A true-colour preview needs at least {RED_BAND_INDEX + 1} bands; "
                f"this image has {source.count}."
            )

        tile = source.read()[
            :,
            :PRITHVI_IMAGE_SIZE,
            :PRITHVI_IMAGE_SIZE,
        ].astype(np.float32)

    visible = np.stack(
        [tile[RED_BAND_INDEX], tile[GREEN_BAND_INDEX], tile[BLUE_BAND_INDEX]],
        axis=-1,
    )

    lower, upper = np.percentile(visible, CONTRAST_STRETCH_PERCENTILES)

    if upper <= lower:
        raise ScenePreviewError("Raster has no contrast to render.")

    stretched = np.clip((visible - lower) / (upper - lower), 0.0, 1.0)

    buffer = io.BytesIO()
    PillowImage.fromarray((stretched * 255).astype(np.uint8)).save(buffer, format="PNG")

    return buffer.getvalue()
