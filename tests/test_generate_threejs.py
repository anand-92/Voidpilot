"""Tests for the generate_threejs tool."""
import pytest
from unittest.mock import patch, MagicMock


class TestGenerateThreeJs:
    """Test suite for generate_threejs function."""

    @pytest.mark.asyncio
    async def test_generate_threejs_returns_code(self):
        """Test that generate_threejs returns Three.js code."""
        from src.app.services.gemini_audio import generate_threejs

        # Mock the genai client and response
        mock_response = MagicMock()
        mock_response.text = """
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
"""

        with patch('src.app.services.gemini_audio.genai.Client') as mock_client_class:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await generate_threejs("a spinning cube")

            # Should return code
            assert result is not None
            assert 'THREE.Scene' in result or 'scene' in result.lower()
            # Should not have markdown code blocks
            assert not result.startswith('```')

    @pytest.mark.asyncio
    async def test_generate_threejs_strips_markdown(self):
        """Test that generate_threejs strips markdown code blocks."""
        from src.app.services.gemini_audio import generate_threejs

        mock_response = MagicMock()
        mock_response.text = """```javascript
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
const scene = new THREE.Scene();
```
"""

        with patch('src.app.services.gemini_audio.genai.Client') as mock_client_class:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            result = await generate_threejs("a red cube")

            # Should strip markdown
            assert not result.startswith('```')
            assert not result.endswith('```')

    @pytest.mark.asyncio
    async def test_generate_threejs_uses_correct_model(self):
        """Test that generate_threejs calls Gemini 3.1 Pro."""
        from src.app.services.gemini_audio import generate_threejs

        mock_response = MagicMock()
        mock_response.text = "const scene = new THREE.Scene();"

        with patch('src.app.services.gemini_audio.genai.Client') as mock_client_class:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            await generate_threejs("a basic scene")

            # Check the model name used
            call_args = mock_client.models.generate_content.call_args
            assert call_args[1]['model'] == 'gemini-3-flash-preview'

    @pytest.mark.asyncio
    async def test_includes_system_prompt(self):
        """Test that generate_threejs includes Three.js developer system prompt."""
        from src.app.services.gemini_audio import generate_threejs

        mock_response = MagicMock()
        mock_response.text = "const scene = new THREE.Scene();"

        with patch('src.app.services.gemini_audio.genai.Client') as mock_client_class:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            await generate_threejs("a spinning cube")

            # Check system instruction was passed
            call_args = mock_client.models.generate_content.call_args
            config = call_args[1]['config']
            system_instruction = config.system_instruction.parts[0].text
            assert 'Three.js developer' in system_instruction
            assert 'expert' in system_instruction.lower()

    @pytest.mark.asyncio
    async def test_generate_threejs_temperature(self):
        """Test that generate_threejs uses temperature 0.35."""
        from src.app.services.gemini_audio import generate_threejs

        mock_response = MagicMock()
        mock_response.text = "const scene = new THREE.Scene();"

        with patch('src.app.services.gemini_audio.genai.Client') as mock_client_class:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            await generate_threejs("test")

            call_args = mock_client.models.generate_content.call_args
            config = call_args[1]['config']
            assert config.temperature == 0.35
