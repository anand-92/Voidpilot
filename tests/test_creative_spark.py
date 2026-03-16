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

    assert "creative engine" in prompt
    assert "mundane" in prompt
    assert "dramatic, cinematic" in prompt
    assert "generate an image or video right away" in prompt
    assert "explicitly asks for it or clearly agrees" in prompt
    assert "same turn" in prompt
    assert "do not ask a second confirmation question" in prompt
    assert "keep that same medium" in prompt
    assert "generate at most one asset per assistant turn" in prompt
    assert "if they ask for a video, call only" in prompt
    assert "never ask broad or abstract questions" in prompt
    assert "you do all the creative heavy lifting" in prompt
    assert "save_brainstorm_artifact" not in prompt
    assert "delegate_to_flash" not in prompt


def test_conversation_starter_pools_have_expected_categories() -> None:
    assert set(CREATIVE_SPARK_CONVERSATION_STARTERS) == {
        "food",
        "recent_activity",
        "surroundings",
    }

    for category, prompts in CREATIVE_SPARK_CONVERSATION_STARTERS.items():
        assert len(prompts) >= 3, category
        assert all(prompt.strip() for prompt in prompts)


def test_select_random_conversation_starter_returns_category_and_question() -> None:
    rng = SequenceRandom(
        ["surroundings", "What's the closest thing to your left hand right now?"]
    )

    category, question = select_creative_spark_conversation_starter(rng=rng)

    assert category == "surroundings"
    assert question == "What's the closest thing to your left hand right now?"


def test_build_creative_spark_system_prompt_injects_selected_starter() -> None:
    rng = SequenceRandom(
        [
            "food",
            "What did you have for lunch?",
        ]
    )

    prompt = build_creative_spark_system_prompt(rng=rng)

    assert "food" in prompt.lower()
    assert "What did you have for lunch?" in prompt
    assert "Start the conversation with this exact question" in prompt


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
            "What's the last thing you ate?",
            "recent_activity",
            "What did you do this morning?",
        ]
    )

    first_prompt = build_creative_spark_system_prompt(rng=rng)
    second_prompt = build_creative_spark_system_prompt(rng=rng)

    assert first_prompt != second_prompt
    assert "What's the last thing you ate?" in first_prompt
    assert "What did you do this morning?" in second_prompt
