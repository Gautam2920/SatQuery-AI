"""Deterministic mapping from a natural-language query to an analytical focus.

This is keyword rule matching, not a language model. It is recorded as such in
the execution trace so the demo never implies reasoning the system did not do.
"""

from dataclasses import dataclass

from satquery_ai.perception.spectral import (
    BUILT_UP_OR_BARE,
    DENSE_VEGETATION,
    SPARSE_VEGETATION,
    UNVEGETATED_SURFACE,
    WATER,
)


INTENT_RESOLVER = "keyword-rule-v1"

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


@dataclass(frozen=True)
class QueryIntent:
    focus: str | None
    land_cover_filter: frozenset[str]
    matched_terms: tuple[str, ...]

    @property
    def description(self) -> str:
        if self.focus is None:
            return "whole-scene region breakdown"

        return f"locate {self.focus}"


def resolve_query_intent(query: str) -> QueryIntent:
    normalized_query = query.casefold()

    for focus, (land_cover_filter, terms) in LAND_COVER_TERMS.items():
        matched_terms = tuple(term for term in terms if term in normalized_query)

        if matched_terms:
            return QueryIntent(
                focus=focus,
                land_cover_filter=land_cover_filter,
                matched_terms=matched_terms,
            )

    return QueryIntent(
        focus=None,
        land_cover_filter=frozenset(),
        matched_terms=(),
    )
