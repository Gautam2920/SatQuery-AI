"""Whether a scene can be analysed, decided in one place for every caller.

Ingestion refuses an incompatible raster outright, so a scene that cannot be
analysed never enters a project. Analysis asks again, because rows stored before
a rule existed are still reachable, and the image listing asks so the library can
say why a scene is barred without re-deriving the rules in the client.

Returning the reason rather than a boolean is deliberate: the same sentence then
reaches the upload error, the analysis refusal and the scene metadata panel.
"""

from satquery_ai.data.compatibility import (
    describe_band_mismatch,
    describe_size_shortfall,
)

from backend.app.geospatial.crs import uses_metre_axes


class SceneIncompatibleError(Exception):
    pass


def describe_incompatibility(
    band_count: int,
    width: int,
    height: int,
    crs: str | None,
) -> str | None:
    """The reason this raster cannot be analysed, or None if it can."""
    band_mismatch = describe_band_mismatch(band_count)

    if band_mismatch is not None:
        return band_mismatch

    size_shortfall = describe_size_shortfall(width, height)

    if size_shortfall is not None:
        return size_shortfall

    if crs is None:
        return (
            "This raster carries no CRS, so nothing measured from it could be "
            "placed on the ground."
        )

    if not uses_metre_axes(crs):
        return (
            f"{crs} is not a metre-based projection, so areas measured in it "
            "would not be in square metres. Reproject the scene to the "
            "appropriate UTM zone and import it again."
        )

    return None
