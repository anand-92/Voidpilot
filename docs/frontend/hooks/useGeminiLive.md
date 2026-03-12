# useGeminiLive Hook

## Overview

The `useGeminiLive` hook provides the core functionality for connecting to the Gemini Live voice assistant. It handles WebSocket communication, audio input/output processing, and message management for real-time voice conversations.

## Connection to Backend

- **WebSocket Endpoint**: `ws://<API_BASE_URL>/api/v1/live/live`
- **Audio Format**: 
  - Input: PCM 16-bit, 16kHz sample rate (microphone captured at device rate, then resampled)
  - Output: PCM 16-bit, 24kHz sample rate

## Key Functions

### `start()`

Initiates a new Gemini Live session by:
1. Creating a WebSocket connection to the backend
2. Requesting microphone access
3. Setting up audio processing pipeline (capture → resample → send)
4. Configuring audio playback context

**Throws**: Error if connection fails or microphone access is denied

### `stop()`

Gracefully terminates the session by:
1. Closing the WebSocket connection
2. Stopping all microphone tracks
3. Disconnecting audio processor
4. Closing audio context
5. Resetting internal state

### `sendText(text: string)`

Sends a text message through the WebSocket to the backend. The message is added to the local messages state with role `user`.

## State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether the WebSocket is connected |
| `isStarting` | `boolean` | Whether a connection is in progress |
| `messages` | `Message[]` | Array of chat messages |
| `intensityRef` | `Ref<number>` | Current audio intensity for visualization |

## Message Types

The hook supports the following message roles:
- `user` - User's text input
- `gemini` - Gemini's text responses
- `system` - System messages (connection status, errors)
- `thought` - Internal thoughts (if any)
- `user_voice` - Voice input transcription
- `gemini_voice` - Voice output transcription

## Audio Processing Pipeline

1. **Capture**: Microphone audio is captured at device sample rate
2. **Resample**: Audio is resampled to 16kHz for backend transmission
3. **Encode**: Convert to PCM 16-bit format
4. **Send**: Transmit via WebSocket binary frame
5. **Receive**: Backend returns hex-encoded audio
6. **Decode**: Convert hex to PCM 16-bit, then to Float32
7. **Playback**: Schedule audio playback at 24kHz

## Usage Example

```tsx
import { useGeminiLive } from '../hooks/useGeminiLive'

function LiveAssistant() {
  const { 
    isConnected, 
    isStarting, 
    messages, 
    intensityRef,
    start, 
    stop, 
    sendText 
  } = useGeminiLive()

  return (
    <div>
      <button onClick={start} disabled={isStarting}>
        Start Conversation
      </button>
      <button onClick={stop} disabled={!isConnected}>
        End Conversation
      </button>
      <div>
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Dependencies

This hook relies on audio utilities from `../utils/audio.ts`:
- `API_BASE_URL` - Backend base URL
- `AUDIO_BUFFER_SIZE` - Script processor buffer size
- `MIC_TARGET_RATE` - Target microphone sample rate (16kHz)
- `createAudioContext()` - Create AudioContext
- `requestMicrophone()` - Request microphone access
- `resampleAudio()` - Resample audio data
- `float32ToPcm16()` / `pcm16ToFloat32()` - Format conversion
- `decodeHexAudio()` - Decode hex string to audio
- `scheduleAudioPlayback()` - Schedule audio playback
- `calculateIntensity()` - Calculate audio intensity
