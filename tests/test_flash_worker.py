from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.app.services.flash_worker import (
    DEFAULT_FLASH_TEXT_MODEL_KEY,
    FLASH_IMAGE_MODEL,
    FLASH_LITE_CONFIG,
    FLASH_LITE_MODEL,
    FLASH_MODEL,
    FLASH_PRO_MODEL,
    PLAIN_TEXT_CONFIG,
    FlashWorker,
    resolve_flash_text_model,
)


@pytest.fixture
def mock_client():
    """Create a mock genai.Client with async generate_content."""
    with patch(
        "src.app.services.flash_worker.genai.Client"
    ) as MockClient:
        client_instance = MagicMock()
        MockClient.return_value = client_instance

        mock_generate = AsyncMock()
        client_instance.aio.models.generate_content = (
            mock_generate
        )

        yield {
            "client_class": MockClient,
            "client_instance": client_instance,
            "generate_content": mock_generate,
        }


@pytest.mark.asyncio
async def test_generate_markdown(mock_client):
    """Flash Lite is called with correct model and prompt,
    returns structured markdown."""
    mock_response = MagicMock()
    mock_response.text = "# My Ideas\n\n- Idea one\n- Idea two"
    mock_client["generate_content"].return_value = mock_response

    worker = FlashWorker(api_key="test_key")
    result = await worker.generate_markdown(
        title="My Ideas",
        raw_ideas="idea one, idea two",
    )

    assert result == "# My Ideas\n\n- Idea one\n- Idea two"

    call_args = mock_client["generate_content"].call_args
    assert call_args.kwargs["model"] == FLASH_LITE_MODEL
    prompt = call_args.kwargs["contents"]
    assert "My Ideas" in prompt
    assert "idea one, idea two" in prompt
    assert call_args.kwargs["config"] is FLASH_LITE_CONFIG
    assert call_args.kwargs["config"].tools
    assert (
        call_args.kwargs["config"].tools[0].google_search
        is not None
    )


def test_resolve_flash_text_model_defaults_to_flash_lite():
    option = resolve_flash_text_model(None)
    assert option.api_model == FLASH_LITE_MODEL

    fallback = resolve_flash_text_model('not-a-real-model')
    assert fallback.api_model == FLASH_LITE_MODEL


@pytest.mark.asyncio
async def test_generate_markdown_uses_selected_flash_model(mock_client):
    mock_response = MagicMock()
    mock_response.text = 'Structured output'
    mock_client["generate_content"].return_value = mock_response

    worker = FlashWorker(api_key='test_key', text_model_key='gemini-3-flash')
    result = await worker.generate_markdown(title='Ideas', raw_ideas='idea one')

    assert result == 'Structured output'
    call_args = mock_client["generate_content"].call_args
    assert call_args.kwargs['model'] == FLASH_MODEL
    assert call_args.kwargs['config'] is FLASH_LITE_CONFIG


@pytest.mark.asyncio
async def test_generate_markdown_retries_without_grounding(mock_client):
    mock_response = MagicMock()
    mock_response.text = 'Fallback output'
    mock_client["generate_content"].side_effect = [
        RuntimeError('google_search unsupported'),
        mock_response,
    ]

    worker = FlashWorker(api_key='test_key', text_model_key='gemini-3.1-pro')
    result = await worker.generate_markdown(title='Ideas', raw_ideas='idea one')

    assert result == 'Fallback output'
    first_call = mock_client["generate_content"].call_args_list[0]
    second_call = mock_client["generate_content"].call_args_list[1]
    assert first_call.kwargs['model'] == FLASH_PRO_MODEL
    assert first_call.kwargs['config'] is FLASH_LITE_CONFIG
    assert second_call.kwargs['model'] == FLASH_PRO_MODEL
    assert second_call.kwargs['config'] is PLAIN_TEXT_CONFIG


@pytest.mark.asyncio
async def test_generate_image(mock_client):
    """Flash Image is called with image-only modality and returns bytes."""
    image_bytes = b"\x89PNG\r\n\x1a\nfake_image_data"

    mock_inline_data = MagicMock()
    mock_inline_data.data = image_bytes

    mock_part_with_image = MagicMock()
    mock_part_with_image.inline_data = mock_inline_data

    mock_content = MagicMock()
    mock_content.parts = [mock_part_with_image]

    mock_candidate = MagicMock()
    mock_candidate.content = mock_content

    mock_response = MagicMock()
    mock_response.candidates = [mock_candidate]
    mock_client["generate_content"].return_value = mock_response

    worker = FlashWorker(api_key="test_key")
    result = await worker.generate_image(prompt="a cat")

    assert result == image_bytes

    call_args = mock_client["generate_content"].call_args
    assert call_args.kwargs["model"] == FLASH_IMAGE_MODEL
    assert call_args.kwargs["contents"] == "a cat"

    config = call_args.kwargs["config"]
    assert config.response_modalities == ["Image"]
    assert "no accompanying text" in config.system_instruction


@pytest.mark.asyncio
async def test_generate_image_no_image_data(mock_client):
    """generate_image raises ValueError when no inline_data
    is present in the response."""
    mock_part = MagicMock()
    mock_part.inline_data = None

    mock_content = MagicMock()
    mock_content.parts = [mock_part]

    mock_candidate = MagicMock()
    mock_candidate.content = mock_content

    mock_response = MagicMock()
    mock_response.candidates = [mock_candidate]
    mock_client["generate_content"].return_value = mock_response

    worker = FlashWorker(api_key="test_key")
    with pytest.raises(
        ValueError, match="No image data"
    ):
        await worker.generate_image(prompt="something")


@pytest.mark.asyncio
async def test_delegate_task(mock_client):
    """Flash Lite is called with task+context prompt,
    returns text result."""
    mock_response = MagicMock()
    mock_response.text = "## Analysis\n\nKey finding here."
    mock_client["generate_content"].return_value = mock_response

    worker = FlashWorker(api_key="test_key")
    result = await worker.delegate_task(
        task="Analyze market trends",
        context="We are building a SaaS product",
        output_format="markdown_section",
    )

    assert result == "## Analysis\n\nKey finding here."

    call_args = mock_client["generate_content"].call_args
    assert call_args.kwargs["model"] == FLASH_LITE_MODEL
    prompt = call_args.kwargs["contents"]
    assert "Analyze market trends" in prompt
    assert "We are building a SaaS product" in prompt
    assert "markdown_section" in prompt
    assert call_args.kwargs["config"] is FLASH_LITE_CONFIG
    assert call_args.kwargs["config"].tools
    assert (
        call_args.kwargs["config"].tools[0].google_search
        is not None
    )


@pytest.mark.asyncio
async def test_delegate_task_default_format(mock_client):
    """delegate_task uses 'markdown_section' as default
    output_format."""
    mock_response = MagicMock()
    mock_response.text = "Result"
    mock_client["generate_content"].return_value = mock_response

    worker = FlashWorker(api_key="test_key")
    result = await worker.delegate_task(
        task="Summarize",
        context="Some context",
    )

    assert result == "Result"

    call_args = mock_client["generate_content"].call_args
    prompt = call_args.kwargs["contents"]
    assert "markdown_section" in prompt


@pytest.mark.asyncio
async def test_flash_worker_uses_correct_models(mock_client):
    """FlashWorker exposes the supported text/image model IDs."""
    assert DEFAULT_FLASH_TEXT_MODEL_KEY == 'gemini-3.1-flash-lite'
    assert FLASH_LITE_MODEL == 'gemini-3.1-flash-lite-preview'
    assert FLASH_MODEL == 'gemini-flash-latest'
    assert FLASH_PRO_MODEL == 'gemini-3.1-pro-preview'
    assert FLASH_IMAGE_MODEL == 'gemini-3.1-flash-image-preview'
