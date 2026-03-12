# Ephemeral Token Service

## Overview

The `ephemeral_token.py` module provides functionality to generate ephemeral tokens for direct Gemini Live API connections. These tokens allow clients to connect directly to Gemini Live without the backend proxying all traffic.

## Key Functions

### `create_ephemeral_token`

```python
def create_ephemeral_token(
    api_key: str,
    model: str = _MODEL,
    duration_mins: int = 30,
) -> str
```

Generates an ephemeral token for direct Gemini Live API connection.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | Required | Google API key for authentication |
| `model` | `str` | `gemini-2.5-flash-native-audio-preview-12-2025` | The model to use |
| `duration_mins` | `int` | `30` | Token validity duration in minutes |

| Returns | Description |
|---------|-------------|
| `str` | The ephemeral token name that can be used for direct connection |

## Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `_API_VERSION` | `"v1beta"` | Google API version |
| `_MODEL` | `"gemini-2.5-flash-native-audio-preview-12-2025"` | Default Gemini model |

## How It Works

### Token Creation Flow

1. **Client Initialization**: Creates a Google GenAI client with the API key
2. **Time Configuration**: Sets the token expiration time based on `duration_mins`
3. **Token Request**: Calls `client.auth_tokens.create()` with configuration:
   - **Uses**: 1 (single-use token)
   - **Expire Time**: Current time + duration
   - **New Session Expire Time**: 1 minute (session must start within 1 minute)
   - **Live Connect Constraints**:
     - Model specification
     - Session resumption enabled
     - Audio response modality
   - **HTTP Options**: API version specification
4. **Return**: Returns the token name string

### Token Configuration Details

```python
config = {
    "uses": 1,                          # Single-use token
    "expire_time": now + timedelta(minutes=30),  # Token expires in 30 mins
    "new_session_expire_time": now + timedelta(minutes=1),  # Must start within 1 min
    "live_connect_constraints": {
        "model": "gemini-2.5-flash-native-audio-preview-12-2025",
        "config": {
            "session_resumption": {},    # Enable session resumption
            "response_modalities": ["AUDIO"],  # Audio responses
        },
    },
    "http_options": {"api_version": "v1beta"},
}
```

## Use Cases

### Direct Client Connection

The primary use case is enabling frontend clients to connect directly to Gemini Live:

1. **Backend generates token**: Calls `create_ephemeral_token()`
2. **Backend sends token**: Sends token to frontend via WebSocket or REST
3. **Frontend connects**: Uses token to connect directly to Google's servers
4. **Bypass proxy**: Traffic goes directly between client and Gemini

### Benefits

| Benefit | Description |
|---------|-------------|
| **Reduced Latency** | Direct connection avoids proxy overhead |
| **Scalability** | Backend doesn't handle audio streams |
| **Resource Savings** | Less server-side processing |

### Trade-offs

| Trade-off | Description |
|-----------|-------------|
| **Token Management** | Need to generate and track tokens |
| **Authentication** | Must securely deliver tokens to clients |
| **Error Handling** | Direct client errors less visible to backend |

## System Interactions

### Upstream Dependencies

- **Google GenAI Client**: Uses `google.genai` for token creation

### Downstream Dependencies

Used in REST endpoints that need to provide direct Gemini Live access:
- The token can be sent to frontend clients who then use it with Gemini's client-side SDK

## Security Considerations

- **Single Use**: Tokens can only be used once (`"uses": 1`)
- **Short Session Window**: Client must start session within 1 minute
- **Expiration**: Token expires after 30 minutes (default)
- **API Key**: Requires valid Google API key

## Example Usage

```python
from app.services.ephemeral_token import create_ephemeral_token

# Generate a token for the frontend
token = create_ephemeral_token(
    api_key="your-google-api-key",
    model="gemini-2.5-flash-native-audio-preview-12-2025",
    duration_mins=30
)

# Send token to frontend
await websocket.send_json({"type": "token", "value": token})
```

## Alternative Architecture

This is an alternative to the main `GeminiLive` flow:

| Approach | Description |
|----------|-------------|
| **Proxy (GeminiLive)** | Backend handles all Gemini communication |
| **Direct (Ephemeral Token)** | Frontend connects directly using token |
