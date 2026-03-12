# useGeminiBrainstorm Hook

## Overview

The `useGeminiBrainstorm` hook provides a creative workspace for generating multimedia content through Gemini. It supports voice conversations, artifact generation (markdown, images, videos), session resumption, and customizable tool sets. This is the most complex hook in the application.

## Connection to Backend

- **WebSocket Endpoint**: `ws://<API_BASE_URL>/api/v1/live/brainstorm`
- **Session Configuration**: Sent via `session_config` message after connection
- **Audio Format**: Same as useGeminiLive (PCM 16-bit, 16kHz input, 24kHz output)

## Key Functions

### `start()`

Initiates a brainstorm session by:
1. Creating a WebSocket connection to the brainstorm endpoint
2. Sending session configuration (flash model, enabled tools)
3. Setting up audio processing pipeline
4. Configuring artifact and message handlers

**Session Config Parameters:**
- `handle`: Session handle for resumption (optional)
- `flash_model`: Selected Flash model (gemini-3.1-flash-lite, gemini-3-flash, gemini-3.1-pro)
- `enabled_tools`: Array of enabled tool IDs

### `stop()`

Gracefully terminates the session by:
1. Closing the WebSocket connection
2. Stopping all microphone tracks
3. Disconnecting audio processor
4. Closing audio context
5. Resetting all state variables

### `sendText(text: string)`

Sends a text message through the WebSocket. Messages are added to local state with role `user`.

## State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether the WebSocket is connected |
| `isStarting` | `boolean` | Whether a connection is in progress |
| `messages` | `Message[]` | Array of chat messages |
| `artifacts` | `Map<string, BrainstormArtifact>` | Generated artifacts (markdown, images, videos) |
| `isGenerating` | `boolean` | Whether a tool is currently generating |
| `intensityRef` | `Ref<number>` | Current audio intensity for visualization |
| `selectedFlashModel` | `BrainstormFlashModel` | Currently selected Flash model |
| `selectedTools` | `BrainstormToolId[]` | Currently enabled tools |

## Configuration Options

### Flash Model Options

```typescript
const BRAINSTORM_FLASH_MODEL_OPTIONS = [
  { value: 'gemini-3.1-flash-lite', label: 'LITE' },
  { value: 'gemini-3-flash', label: 'FLASH' },
  { value: 'gemini-3.1-pro', label: 'PRO' },
]
```

### Tool Options

```typescript
const BRAINSTORM_TOOL_OPTIONS = [
  { id: 'save_brainstorm_artifact', label: 'Artifact' },
  { id: 'generate_brainstorm_image', label: 'Image' },
  { id: 'generate_brainstorm_video', label: 'Video' },
]
```

## Artifact Management

### Artifact Structure

```typescript
type BrainstormArtifact = {
  filename: string
  content: string      // Base64 encoded for images/videos, text for markdown
  mimeType: string      // text/markdown, image/png, video/mp4
  label?: string        // Optional display label
  updatedAt: string    // ISO timestamp
}
```

### MIME Type Mapping

| Tool Type | MIME Type |
|-----------|-----------|
| brainstorm_artifact | text/markdown |
| brainstorm_image | image/png |
| brainstorm_video | video/mp4 |

### Artifact Handling

The hook processes artifact messages from the backend:
1. **Receipt**: Intercepts `brainstorm_artifact`, `brainstorm_image`, `brainstorm_video` messages
2. **Creation**: Creates artifact object with appropriate MIME type
3. **Storage**: Upserts into artifacts Map using filename as key
4. **State Update**: Sets `isGenerating` to false after receipt

## Message Handling

### Text Messages
- `type: 'text'` - Regular text responses from Gemini
- Added to messages array with role `gemini` or `user`

### Audio Messages
- `type: 'audio'` - Hex-encoded audio responses
- Decoded and played through audio context
- Intensity calculated for visualization

### System Messages

| Type | Description |
|------|-------------|
| `session_resumption_update` | Updates session handle for future resumption |
| `interrupted` | Audio playback interrupted, resets playhead |
| `tool_call_start` | Tool execution started, sets `isGenerating = true` |
| `tool_call` | Tool call received, sets `isGenerating = false` |
| `turn_complete` | Gemini finished a turn, marks turn boundary |

## Turn Boundary & Tool Response Tracking

The hook maintains internal refs for message handling:

- `turnBoundaryRef`: Marks when a new Gemini turn starts
- `toolCallPendingRef`: Tracks if a tool call is pending
- `toolResponseTurnRef`: Marks if current turn contains tool responses

This enables proper message appending vs. new message creation.

## Session Resumption

The hook supports session resumption:
1. On connection, sends `session_config` with optional `handle`
2. Backend responds with `session_resumption_update` containing new/existing handle
3. Handle is stored in `sessionHandleRef.current`
4. Can be passed to future `start()` calls for session continuation

## Usage Example

```tsx
import { useGeminiBrainstorm } from '../hooks/useGeminiBrainstorm'
import { 
  BRAINSTORM_FLASH_MODEL_OPTIONS, 
  BRAINSTORM_TOOL_OPTIONS 
} from '../hooks/useGeminiBrainstorm'

function BrainstormWorkspace() {
  const {
    isConnected,
    isStarting,
    messages,
    artifacts,
    isGenerating,
    intensityRef,
    selectedFlashModel,
    setSelectedFlashModel,
    selectedTools,
    setSelectedTools,
    start,
    stop,
    sendText,
  } = useGeminiBrainstorm()

  return (
    <div>
      {/* Model Selection */}
      <select 
        value={selectedFlashModel}
        onChange={(e) => setSelectedFlashModel(e.target.value)}
      >
        {BRAINSTORM_FLASH_MODEL_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Tool Selection */}
      {BRAINSTORM_TOOL_OPTIONS.map(tool => (
        <label key={tool.id}>
          <input
            type="checkbox"
            checked={selectedTools.includes(tool.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedTools([...selectedTools, tool.id])
              } else {
                setSelectedTools(selectedTools.filter(t => t !== tool.id))
              }
            }}
          />
          {tool.label}
        </label>
      ))}

      {/* Generation Status */}
      {isGenerating && <div className="generating">Generating...</div>}

      {/* Messages */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Artifacts */}
      <div className="artifacts">
        {Array.from(artifacts.values()).map(artifact => (
          <div key={artifact.filename}>
            {artifact.mimeType.startsWith('image/') && (
              <img src={`data:${artifact.mimeType};base64,${artifact.content}`} />
            )}
            {artifact.mimeType === 'text/markdown' && (
              <pre>{artifact.content}</pre>
            )}
          </div>
        ))}
      </div>

      <button onClick={start} disabled={isStarting}>Start</button>
      <button onClick={stop} disabled={!isConnected}>Stop</button>
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

Also imports types from `useGeminiLive.ts`:
- `Message` - Message structure
- `MessageRole` - Message role type
