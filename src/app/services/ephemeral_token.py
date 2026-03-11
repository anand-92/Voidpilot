from datetime import UTC, datetime, timedelta

from google import genai

_API_VERSION = "v1beta"
_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


def create_ephemeral_token(
    api_key: str,
    model: str = _MODEL,
    duration_mins: int = 30,
) -> str:
    """Generate an ephemeral token for direct Gemini Live API connection."""
    client = genai.Client(api_key=api_key, http_options={"api_version": _API_VERSION})
    now = datetime.now(tz=UTC)

    token = client.auth_tokens.create(
        config={
            "uses": 1,
            "expire_time": now + timedelta(minutes=duration_mins),
            "new_session_expire_time": now + timedelta(minutes=1),
            "live_connect_constraints": {
                "model": model,
                "config": {
                    "session_resumption": {},
                    "response_modalities": ["AUDIO"],
                },
            },
            "http_options": {"api_version": _API_VERSION},
        }
    )
    return token.name
