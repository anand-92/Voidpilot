"""Tests for brainstorm_type mode routing in the brainstorm WebSocket endpoint.

Covers: creative_spark tool filtering, open_studio full tools,
missing/unknown brainstorm_type defaults, enabled_tools override
protection, system prompt selection, and audio config.
"""

import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app.api.v1.endpoints.brainstorm import (
    BRAINSTORM_SYSTEM_PROMPT,
    CREATIVE_SPARK_SYSTEM_PROMPT,
    _build_tool_defs,
    _make_tool_handlers,
    build_creative_spark_system_prompt,
)
from src.app.main import app


# ── Creative Spark tool filtering ────────────────────────────────


class TestCreativeSparkToolDefs:
    """VAL-SPARK-005: creative_spark restricts tool defs to image+video."""

    def test_creative_spark_tool_defs_only_image_and_video(self):
        """_build_tool_defs with brainstorm_type='creative_spark' returns
        only generate_brainstorm_image and generate_brainstorm_video."""
        tool_defs = _build_tool_defs(brainstorm_type="creative_spark")
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert names == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }
        assert len(decls) == 2

    def test_creative_spark_excludes_delegate_to_flash(self):
        """delegate_to_flash must NOT appear in creative_spark defs."""
        tool_defs = _build_tool_defs(brainstorm_type="creative_spark")
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert "delegate_to_flash" not in names

    def test_creative_spark_excludes_save_artifact(self):
        """save_brainstorm_artifact must NOT appear in creative_spark defs."""
        tool_defs = _build_tool_defs(brainstorm_type="creative_spark")
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert "save_brainstorm_artifact" not in names


class TestCreativeSparkToolMapping:
    """VAL-SPARK-006: creative_spark tool mapping matches defs."""

    @pytest.mark.asyncio
    async def test_creative_spark_mapping_only_image_and_video(self):
        """_make_tool_handlers with brainstorm_type='creative_spark'
        returns only image and video handlers."""
        mock_ws = AsyncMock()
        from starlette.websockets import WebSocketState

        mock_ws.client_state = WebSocketState.CONNECTED

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                brainstorm_type="creative_spark",
            )

        assert set(mapping.keys()) == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

    @pytest.mark.asyncio
    async def test_creative_spark_mapping_excludes_delegate(self):
        """delegate_to_flash must NOT appear in creative_spark mapping."""
        mock_ws = AsyncMock()

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                brainstorm_type="creative_spark",
            )

        assert "delegate_to_flash" not in mapping

    @pytest.mark.asyncio
    async def test_creative_spark_mapping_excludes_save_artifact(self):
        """save_brainstorm_artifact must NOT appear in creative_spark
        mapping."""
        mock_ws = AsyncMock()

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                brainstorm_type="creative_spark",
            )

        assert "save_brainstorm_artifact" not in mapping


# ── Open Studio full tools ───────────────────────────────────────


class TestOpenStudioToolDefs:
    """VAL-SPARK-009: open_studio keeps all 4 tools."""

    def test_open_studio_tool_defs_all_four(self):
        """_build_tool_defs with brainstorm_type='open_studio' returns
        all 4 tool definitions."""
        tool_defs = _build_tool_defs(brainstorm_type="open_studio")
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert names == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }
        assert len(decls) == 4

    def test_open_studio_includes_delegate(self):
        """delegate_to_flash is present in open_studio defs."""
        tool_defs = _build_tool_defs(brainstorm_type="open_studio")
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert "delegate_to_flash" in names


class TestOpenStudioToolMapping:
    """VAL-SPARK-009: open_studio keeps all 4 tool handlers."""

    @pytest.mark.asyncio
    async def test_open_studio_mapping_all_four(self):
        """_make_tool_handlers with brainstorm_type='open_studio'
        returns all 4 handlers."""
        mock_ws = AsyncMock()

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                brainstorm_type="open_studio",
            )

        assert set(mapping.keys()) == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }


# ── Missing/unknown brainstorm_type defaults ─────────────────────


class TestDefaultBrainstormType:
    """VAL-SPARK-008: missing/unknown brainstorm_type defaults
    to open_studio behavior."""

    def test_missing_brainstorm_type_defaults_tool_defs(self):
        """When brainstorm_type is None, _build_tool_defs returns
        open_studio defaults (all 4 tools)."""
        tool_defs = _build_tool_defs(brainstorm_type=None)
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert names == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }

    def test_unknown_brainstorm_type_defaults_tool_defs(self):
        """When brainstorm_type is an unknown value, _build_tool_defs
        returns open_studio defaults."""
        tool_defs = _build_tool_defs(brainstorm_type="unknown_mode")
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert names == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }

    @pytest.mark.asyncio
    async def test_missing_brainstorm_type_defaults_tool_mapping(self):
        """When brainstorm_type is None, _make_tool_handlers returns
        open_studio defaults (all 4 handlers)."""
        mock_ws = AsyncMock()

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                brainstorm_type=None,
            )

        assert set(mapping.keys()) == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }

    @pytest.mark.asyncio
    async def test_unknown_brainstorm_type_defaults_tool_mapping(self):
        """When brainstorm_type is an unknown value,
        _make_tool_handlers returns open_studio defaults."""
        mock_ws = AsyncMock()

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                brainstorm_type="some_future_mode",
            )

        assert set(mapping.keys()) == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }


# ── enabled_tools cannot override creative_spark ─────────────────


class TestEnabledToolsOverrideProtection:
    """VAL-SPARK-011: enabled_tools does not override
    creative_spark restrictions."""

    def test_enabled_tools_cannot_add_delegate_in_creative_spark_defs(self):
        """Even if enabled_tools includes delegate_to_flash,
        creative_spark defs exclude it."""
        tool_defs = _build_tool_defs(
            enabled_tools=[
                "save_brainstorm_artifact",
                "generate_brainstorm_image",
                "generate_brainstorm_video",
                "delegate_to_flash",
            ],
            brainstorm_type="creative_spark",
        )
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert names == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

    @pytest.mark.asyncio
    async def test_enabled_tools_cannot_add_delegate_in_creative_spark_mapping(
        self,
    ):
        """Even if enabled_tools includes delegate_to_flash,
        creative_spark mapping excludes it."""
        mock_ws = AsyncMock()

        with patch(
            "src.app.api.v1.endpoints.brainstorm.FlashWorker"
        ):
            mapping = _make_tool_handlers(
                mock_ws,
                "test_key",
                enabled_tools=[
                    "save_brainstorm_artifact",
                    "generate_brainstorm_image",
                    "generate_brainstorm_video",
                    "delegate_to_flash",
                ],
                brainstorm_type="creative_spark",
            )

        assert set(mapping.keys()) == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

    def test_enabled_tools_cannot_add_save_artifact_in_creative_spark(self):
        """Even if enabled_tools includes save_brainstorm_artifact,
        creative_spark defs exclude it."""
        tool_defs = _build_tool_defs(
            enabled_tools=[
                "save_brainstorm_artifact",
                "generate_brainstorm_image",
                "generate_brainstorm_video",
            ],
            brainstorm_type="creative_spark",
        )
        decls = tool_defs[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert "save_brainstorm_artifact" not in names


# ── System prompt selection ──────────────────────────────────────


class TestSystemPromptSelection:
    """VAL-STUDIO-001, VAL-SPARK-005: system prompt routing by mode."""

    @pytest.mark.asyncio
    async def test_open_studio_system_prompt_unchanged(self):
        """Open Studio uses BRAINSTORM_SYSTEM_PROMPT (unchanged)."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ) as websocket:
                websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_config",
                            "brainstorm_type": "open_studio",
                        }
                    )
                )
                time.sleep(0.5)

        # After session_config, the gemini_client.system_prompt
        # should be updated to BRAINSTORM_SYSTEM_PROMPT
        assert mock_gemini_instance.system_prompt == BRAINSTORM_SYSTEM_PROMPT

    @pytest.mark.asyncio
    async def test_creative_spark_uses_creative_spark_prompt(self):
        """Creative Spark uses a prompt built from
        CREATIVE_SPARK_SYSTEM_PROMPT template."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ) as websocket:
                websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_config",
                            "brainstorm_type": "creative_spark",
                        }
                    )
                )
                time.sleep(0.5)

        prompt = mock_gemini_instance.system_prompt
        assert "Creative Spark Mode" in prompt
        assert "inspiration engine" in prompt
        # Should NOT be the brainstorm prompt
        assert "creative thinking partner" not in prompt


# ── Audio config unchanged ───────────────────────────────────────


class TestAudioConfigUnchanged:
    """VAL-STUDIO-007: Open Studio audio config is unchanged."""

    @pytest.mark.asyncio
    async def test_open_studio_audio_config(self):
        """Open Studio GeminiLive uses input_sample_rate=16000,
        voice_name='Aoede', model=MODEL."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ):
                time.sleep(0.5)

        call_kwargs = MockGeminiLive.call_args[1]
        assert call_kwargs["input_sample_rate"] == 16000
        assert call_kwargs["voice_name"] == "Aoede"
        assert (
            call_kwargs["model"]
            == "gemini-2.5-flash-native-audio-preview-12-2025"
        )


# ── WebSocket integration: brainstorm_type routing ───────────────


class TestWebSocketBrainstormTypeRouting:
    """Integration tests for brainstorm_type in session_config."""

    @pytest.mark.asyncio
    async def test_creative_spark_session_config_restricts_tools(self):
        """When session_config sends brainstorm_type='creative_spark',
        GeminiLive tools and mapping are restricted."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ) as websocket:
                websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_config",
                            "brainstorm_type": "creative_spark",
                        }
                    )
                )
                time.sleep(0.5)

        # Check tools assigned to gemini_client
        tools = mock_gemini_instance.tools
        tool_names = set()
        for tool_group in tools:
            for decl in tool_group.get("function_declarations", []):
                tool_names.add(decl["name"])
        assert tool_names == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

        # Check tool_mapping
        mapping_keys = set(mock_gemini_instance.tool_mapping.keys())
        assert mapping_keys == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

    @pytest.mark.asyncio
    async def test_missing_brainstorm_type_defaults_to_open_studio_ws(
        self,
    ):
        """When session_config does not include brainstorm_type,
        open_studio defaults apply (all 4 tools)."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ) as websocket:
                websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_config",
                            "flash_model": "gemini-2-flash-lite",
                        }
                    )
                )
                time.sleep(0.5)

        # Check tools: should be all 4 (open_studio default)
        tools = mock_gemini_instance.tools
        tool_names = set()
        for tool_group in tools:
            for decl in tool_group.get("function_declarations", []):
                tool_names.add(decl["name"])
        assert tool_names == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }

    @pytest.mark.asyncio
    async def test_enabled_tools_does_not_override_creative_spark_ws(self):
        """VAL-SPARK-011: When session_config sends both
        brainstorm_type='creative_spark' and enabled_tools with
        disabled tools, creative_spark restrictions take precedence."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ) as websocket:
                websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_config",
                            "brainstorm_type": "creative_spark",
                            "enabled_tools": [
                                "save_brainstorm_artifact",
                                "generate_brainstorm_image",
                                "generate_brainstorm_video",
                                "delegate_to_flash",
                            ],
                        }
                    )
                )
                time.sleep(0.5)

        # Creative spark restrictions should win
        tools = mock_gemini_instance.tools
        tool_names = set()
        for tool_group in tools:
            for decl in tool_group.get("function_declarations", []):
                tool_names.add(decl["name"])
        assert tool_names == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

        mapping_keys = set(mock_gemini_instance.tool_mapping.keys())
        assert mapping_keys == {
            "generate_brainstorm_image",
            "generate_brainstorm_video",
        }

    @pytest.mark.asyncio
    async def test_unknown_brainstorm_type_defaults_ws(self):
        """Unknown brainstorm_type falls back to open_studio in
        WebSocket flow."""
        mock_settings = MagicMock()
        mock_settings.GOOGLE_API_KEY = "test_key"

        with (
            patch(
                "src.app.api.v1.endpoints.brainstorm.settings",
                mock_settings,
            ),
            patch(
                "src.app.api.v1.endpoints.brainstorm.GeminiLive",
            ) as MockGeminiLive,
        ):
            mock_gemini_instance = AsyncMock()
            MockGeminiLive.return_value = mock_gemini_instance

            async def mock_start_session(*args, **kwargs):
                yield {"type": "turn_complete"}

            mock_gemini_instance.start_session = mock_start_session

            client = TestClient(app)
            with client.websocket_connect(
                "/api/v1/live/brainstorm"
            ) as websocket:
                websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_config",
                            "brainstorm_type": "some_future_mode",
                        }
                    )
                )
                time.sleep(0.5)

        # Should get open_studio defaults
        tools = mock_gemini_instance.tools
        tool_names = set()
        for tool_group in tools:
            for decl in tool_group.get("function_declarations", []):
                tool_names.add(decl["name"])
        assert tool_names == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }

        assert mock_gemini_instance.system_prompt == BRAINSTORM_SYSTEM_PROMPT
