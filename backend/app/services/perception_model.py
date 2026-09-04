"""Process-wide Prithvi segmenter.

Importing terratorch and building the backbone costs roughly fifteen seconds, so
the segmenter is created once on first use and reused for every later request.
"""

import threading

from satquery_ai.perception.region_segmentation import PrithviRegionSegmenter


_segmenter: PrithviRegionSegmenter | None = None
_lock = threading.Lock()


def get_region_segmenter() -> PrithviRegionSegmenter:
    global _segmenter

    if _segmenter is None:
        with _lock:
            if _segmenter is None:
                _segmenter = PrithviRegionSegmenter()

    return _segmenter
