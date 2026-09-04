"""CRS rules the measurement pipeline depends on.

Region areas and perimeters are computed by shapely in the raster's own
coordinate system, so the numbers only mean square metres and metres when that
system's axes are in metres. A geographic CRS such as EPSG:4326 would yield
square degrees, which the rest of the pipeline would then report as area.

Reprojecting to a suitable projected CRS is the eventual answer; until that
exists as a deliberate feature, such a raster is refused rather than mismeasured.
"""

from pyproj import CRS
from pyproj.exceptions import CRSError


METRE = "metre"


def uses_metre_axes(crs: str) -> bool:
    try:
        parsed = CRS.from_user_input(crs)
    except CRSError:
        return False

    return bool(parsed.axis_info) and all(
        axis.unit_name == METRE for axis in parsed.axis_info
    )
