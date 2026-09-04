"""Decide whether a question is one this system can actually answer.

This is keyword rule matching, not a language model, and it is recorded as such
in the execution trace so the demo never implies reasoning the system did not do.

The important property is that there is no catch-all: a question that matches no
supported capability is refused rather than quietly answered with a whole-scene
breakdown. Asking "what is the capital of France?" must not return regions.
"""

from dataclasses import dataclass
from typing import Literal

from satquery_ai.perception.spectral import (
    BUILT_UP_OR_BARE,
    DENSE_VEGETATION,
    SPARSE_VEGETATION,
    UNVEGETATED_SURFACE,
    WATER,
)


INTENT_RESOLVER = "keyword-rule-v2"

QueryOutcome = Literal["supported", "unsupported", "invalid"]

LAND_COVER_TERMS: dict[str, tuple[frozenset[str], tuple[str, ...]]] = {
    "water": (
        frozenset({WATER}),
        ("water", "river", "lake", "flood", "inundat", "reservoir", "wetland"),
    ),
    "vegetation": (
        frozenset({DENSE_VEGETATION, SPARSE_VEGETATION}),
        ("vegetat", "forest", "tree", "crop", "canopy", "farm", "agricultur", "green"),
    ),
    "built-up or bare ground": (
        frozenset({BUILT_UP_OR_BARE, UNVEGETATED_SURFACE}),
        ("built", "urban", "city", "settlement", "bare", "soil", "building", "barren"),
    ),
}

SCENE_BREAKDOWN_PHRASES = (
    "land cover",
    "landcover",
    "breakdown",
    "whole scene",
)

# Paired with "scene" so "describe the scene" is a breakdown request while
# "describe the weather" is not.
SCENE_BREAKDOWN_VERBS = (
    "summaris",
    "summariz",
    "describe",
    "segment",
    "classify",
    "what is in",
    "what's in",
    "overview",
)

# Capabilities a user could reasonably expect from a remote-sensing assistant but
# that this build does not have. Naming which one was asked for is more useful
# than a generic refusal, and it keeps the roadmap honest on stage.
UNSUPPORTED_CAPABILITY_RULES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    (
        "change detection",
        "Comparing two passes of the same area is not built yet; this build "
        "analyses a single scene.",
        (
            "since 20",
            "retreat",
            "changed",
            "change detection",
            "bi-temporal",
            "bitemporal",
            "two passes",
            "before and after",
            "compared to",
            "compare to",
            "over time",
            "expanded",
            "shrunk",
            "shrank",
            "grown",
            "drained",
        ),
    ),
    (
        "object counting",
        "Counting discrete objects needs a detection model; this build measures "
        "regions of land cover, not individual objects.",
        ("how many", "count the", "number of", "how much of each"),
    ),
    (
        "object detection",
        "Detecting individual objects is not built yet; this build separates the "
        "scene into land-cover regions.",
        (
            "structure",
            "vehicle",
            "car ",
            "ship",
            "boat",
            "aircraft",
            "plane",
            "road",
            "bridge",
            "solar panel",
            "house",
            "rooftop",
        ),
    ),
    (
        "SAR analysis",
        "This build reads 6-band optical imagery; SAR backscatter is not "
        "supported.",
        ("sar ", "backscatter", "polarisation", "polarization", "interferom"),
    ),
    (
        "terrain and weather",
        "Elevation, slope and weather products are outside the imagery this "
        "build reads.",
        (
            "elevation",
            "slope",
            "terrain",
            "dem",
            "rainfall",
            "precipitation",
            "temperature",
            "weather",
            "forecast",
        ),
    ),
)

OFF_TOPIC_REFUSAL = (
    "This query is not currently supported by SatQuery AI. It answers questions "
    "about land cover in a loaded scene — where water, vegetation or built-up "
    "ground is, or a breakdown of the whole scene."
)

EMPTY_QUERY_REFUSAL = "Enter a question about the loaded scene."


@dataclass(frozen=True)
class QueryIntent:
    outcome: QueryOutcome
    focus: str | None
    land_cover_filter: frozenset[str]
    matched_terms: tuple[str, ...]
    refusal: str | None = None
    unsupported_capability: str | None = None

    @property
    def is_supported(self) -> bool:
        return self.outcome == "supported"

    @property
    def description(self) -> str:
        if self.outcome == "invalid":
            return "empty query"

        if self.outcome == "unsupported":
            return f"unsupported: {self.unsupported_capability or 'out of scope'}"

        if self.focus is None:
            return "whole-scene region breakdown"

        return f"locate {self.focus}"


def _unsupported(capability: str, refusal: str, matched: tuple[str, ...]) -> QueryIntent:
    return QueryIntent(
        outcome="unsupported",
        focus=None,
        land_cover_filter=frozenset(),
        matched_terms=matched,
        refusal=refusal,
        unsupported_capability=capability,
    )


def resolve_query_intent(query: str) -> QueryIntent:
    normalized_query = " ".join(query.casefold().split())

    if not normalized_query:
        return QueryIntent(
            outcome="invalid",
            focus=None,
            land_cover_filter=frozenset(),
            matched_terms=(),
            refusal=EMPTY_QUERY_REFUSAL,
        )

    # Checked before land cover so "how many buildings" is refused as counting
    # rather than answered as a built-up query.
    for capability, refusal, terms in UNSUPPORTED_CAPABILITY_RULES:
        matched_terms = tuple(term for term in terms if term in normalized_query)

        if matched_terms:
            return _unsupported(capability, refusal, matched_terms)

    for focus, (land_cover_filter, terms) in LAND_COVER_TERMS.items():
        matched_terms = tuple(term for term in terms if term in normalized_query)

        if matched_terms:
            return QueryIntent(
                outcome="supported",
                focus=focus,
                land_cover_filter=land_cover_filter,
                matched_terms=matched_terms,
            )

    breakdown_terms = tuple(
        phrase for phrase in SCENE_BREAKDOWN_PHRASES if phrase in normalized_query
    )

    if not breakdown_terms and "scene" in normalized_query:
        breakdown_terms = tuple(
            verb for verb in SCENE_BREAKDOWN_VERBS if verb in normalized_query
        )

    if breakdown_terms:
        return QueryIntent(
            outcome="supported",
            focus=None,
            land_cover_filter=frozenset(),
            matched_terms=breakdown_terms,
        )

    return _unsupported("out of scope", OFF_TOPIC_REFUSAL, ())
