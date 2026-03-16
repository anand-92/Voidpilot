# useWalkthroughAgent Hook

## Overview

`useWalkthroughAgent` manages the full walkthrough client session: websocket connection, microphone capture, audio playback, transcript state, tool activity, typed input, and connection/error states.

## Connection to Backend

- **WebSocket Endpoint**: `ws://<API_BASE_URL>/api/v1/live/walkthrough`
- **Session config**: sends a `session_config` message so the backend can apply the selected voice
- **Audio Format**: PCM16, 16kHz input and 24kHz playback
- **Typed input**: text questions are sent through the same walkthrough websocket session

## Public API

### Session controls

| Field | Type | Description |
|------|------|-------------|
| `start()` | `() => Promise<void>` | Opens the websocket, microphone, and audio playback pipeline |
| `stop()` | `() => void` | Closes websocket/audio resources and resets session state |
| `sendText()` | `(content: string) => boolean` | Sends typed text through the active walkthrough session |

### Session state

| Field | Type | Description |
|------|------|-------------|
| `connectionStatus` | `WalkthroughConnectionStatus` | `disconnected`, `connecting`, `connected`, `error`, or `degraded` |
| `errorMessage` | `string \| null` | Last surfaced error/degraded message |
| `selectedVoice` | `BrainstormVoice` | Active walkthrough voice choice |
| `setSelectedVoice` | setter | Updates the selected voice before or during a session |
| `transcript` | `WalkthroughTranscriptItem[]` | Transcript list containing speech turns and inline tool activity |
| `toolActivity` | `WalkthroughToolActivity` | Current grounding activity state |

### Audio refs

| Field | Type | Description |
|------|------|-------------|
| `inputIntensityRef` | `Ref<number>` | Smoothed microphone intensity |
| `outputIntensityRef` | `Ref<number>` | Smoothed Gemini playback intensity |

## Transcript Model

The hook keeps a session-local transcript instead of a simple message list.

- Consecutive text chunks are merged with overlap detection so partial transcripts do not duplicate content.
- Turns are separated using server events like `turn_complete` and `interrupted`.
- Inline `tool_activity` entries are inserted directly into the transcript when project grounding starts or finishes.

The transcript item union is defined in `frontend/src/types/walkthrough.ts`.

## Tool Activity Handling

Walkthrough grounding is visible in the UI through two coordinated states:

1. `toolActivity` tracks the current global status (`idle`, `searching`, `complete`, `no_results`, `error`)
2. Transcript entries capture the latest tool step inline so users can see when the walkthrough searched project docs

Tool results are classified heuristically from returned text so “no results” and errors render differently from successful searches.

## Audio Pipeline

1. Request microphone access
2. Create an `AudioContext`
3. Stream resampled 16kHz PCM16 microphone audio to the backend
4. Decode and schedule returned 24kHz PCM16 playback
5. Track playback windows to estimate live output intensity
6. Smooth input/output levels for UI visualizers

## Connection Behavior

- Sends a `session_config` payload after connecting so the backend can apply the chosen voice
- Handles degraded mode when microphone access fails but typed text can still work
- Surfaces websocket/server errors into `connectionStatus` and `errorMessage`
- Clears transcript/tool state when the session stops

## Example Usage

```tsx
const {
  connectionStatus,
  errorMessage,
  transcript,
  toolActivity,
  start,
  stop,
  sendText,
  selectedVoice,
  setSelectedVoice,
} = useWalkthroughAgent()
```

This hook is primarily consumed by `frontend/src/components/walkthrough/WalkthroughOverlay.tsx`.

## Dependencies

Audio helpers come from `frontend/src/utils/audio.ts`, including:

- `createAudioContext`
- `requestMicrophone`
- `resampleAudio`
- `float32ToPcm16` / `pcm16ToFloat32`
- `decodeHexAudio`
- `scheduleAudioPlayback`
- `stopScheduledAudioPlayback`
- `calculateIntensity`
- `smoothIntensity`
