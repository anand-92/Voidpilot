from collections.abc import Sequence

import pytest

from src.app.api.v1.endpoints.brainstorm import (
    BRAINSTORM_SYSTEM_PROMPT,
    CREATIVE_SPARK_CONVERSATION_STARTERS,
    CREATIVE_SPARK_SYSTEM_PROMPT,
    build_creative_spark_system_prompt,
    select_creative_spark_conversation_starter,
)


class SequenceRandom:
    def __init__(self, picks: Sequence[str]):
        self._picks = list(picks)

    def choice(self, options: Sequence[str]) -> str:
        pick = self._picks.pop(0)
        assert pick in options
        return pick


def test_creative_spark_prompt_is_non_empty_and_distinct() -> None:
    assert CREATIVE_SPARK_SYSTEM_PROMPT.strip()
    assert CREATIVE_SPARK_SYSTEM_PROMPT != BRAINSTORM_SYSTEM_PROMPT


def test_creative_spark_prompt_has_expected_guidance_without_disabled_tools() -> None:
    prompt = CREATIVE_SPARK_SYSTEM_PROMPT.lower()

    assert "inspiration engine" in prompt
    assert "2-3 easy warmup questions" in prompt
    assert "mundane answers" in prompt
    assert "wild, cinematic" in prompt
    assert "generate images or videos immediately" in prompt
    assert "keep creative momentum flowing" in prompt
    assert "save_brainstorm_artifact" not in prompt
    assert "delegate_to_flash" not in prompt


def test_conversation_starter_pools_have_expected_categories() -> None:
    assert set(CREATIVE_SPARK_CONVERSATION_STARTERS) == {
        "food",
        "recent_activity",
        "mood",
    }

    for category, prompts in CREATIVE_SPARK_CONVERSATION_STARTERS.items():
        assert len(prompts) >= 3, category
        assert all(prompt.strip() for prompt in prompts)


def test_select_random_conversation_starter_returns_category_and_question() -> None:
    rng = SequenceRandom(["mood", "What kind of energy are you carrying right now?"])

    category, question = select_creative_spark_conversation_starter(rng=rng)

    assert category == "mood"
    assert question == "What kind of energy are you carrying right now?"


def test_build_creative_spark_system_prompt_injects_selected_starter() -> None:
    rng = SequenceRandom(
        [
            "food",
            "What did you eat recently that felt unexpectedly comforting?",
        ]
    )

    prompt = build_creative_spark_system_prompt(rng=rng)

    assert "food" in prompt.lower()
    assert "What did you eat recently that felt unexpectedly comforting?" in prompt
    assert "Start with this exact warmup question" in prompt


def test_select_random_conversation_starter_rejects_empty_pools() -> None:
    with pytest.raises(ValueError, match="at least one category"):
        select_creative_spark_conversation_starter(starter_pools={})


def test_select_random_conversation_starter_rejects_empty_category_questions() -> None:
    rng = SequenceRandom(["food"])

    with pytest.raises(ValueError, match="at least one question"):
        select_creative_spark_conversation_starter(
            starter_pools={"food": []},
            rng=rng,
        )


def test_multiple_prompt_builds_can_produce_different_starters() -> None:
    rng = SequenceRandom(
        [
            "food",
            "What snack have you been thinking about lately?",
            "recent_activity",
            "What were you doing right before this conversation started?",
        ]
    )

    first_prompt = build_creative_spark_system_prompt(rng=rng)
    second_prompt = build_creative_spark_system_prompt(rng=rng)

    assert first_prompt != second_prompt
    assert "What snack have you been thinking about lately?" in first_prompt
    assert (
        "What were you doing right before this conversation started?"
        in second_prompt
    )
