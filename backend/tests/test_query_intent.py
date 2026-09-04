import pytest

from backend.app.services.query_intent import resolve_query_intent


@pytest.mark.parametrize(
    "query, expected_focus",
    [
        ("Where is the water?", "water"),
        ("show me the flooded fields", "water"),
        ("Where is the vegetation?", "vegetation"),
        ("how much cropland is there", "vegetation"),
        ("locate built-up areas", "built-up or bare ground"),
        ("where is the bare soil", "built-up or bare ground"),
    ],
)
def test_resolves_land_cover_focus(query, expected_focus):
    intent = resolve_query_intent(query)

    assert intent.focus == expected_focus
    assert intent.matched_terms
    assert intent.land_cover_filter


def test_unrecognised_query_falls_back_to_whole_scene():
    intent = resolve_query_intent("summarise this scene")

    assert intent.focus is None
    assert intent.land_cover_filter == frozenset()
    assert intent.matched_terms == ()
    assert intent.description == "whole-scene region breakdown"


def test_matching_is_case_insensitive():
    assert resolve_query_intent("WHERE IS THE WATER").focus == "water"
