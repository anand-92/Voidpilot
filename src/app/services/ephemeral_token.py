import datetime

from google import genai


def create_ephemeral_token(api_key: str) -> str:
    """
    Generate an ephemeral token for direct Gemini Live API connection.

    Args:
        api_key: The Google API key to use for authentication.

    Returns:
        The ephemeral token name that can be used by the frontend.
    """
    client = genai.Client(
        api_key=api_key,
        http_options={"api_version": "v1alpha"}
    )

    now = datetime.datetime.now(tz=datetime.timezone.utc)

    token = client.auth_tokens.create(
        config={
            "uses": 1,
            "expire_time": now + datetime.timedelta(minutes=30),
            "new_session_expire_time": now + datetime.timedelta(minutes=1),
            "live_connect_constraints": {
                "model": "gemini-2.5-flash-native-audio-preview-12-2025",
                "config": {
                    "session_resumption": {},
                    "response_modalities": ["AUDIO"],
                }
            },
            "http_options": {"api_version": "v1alpha"},
        }
    )

    return token.name
