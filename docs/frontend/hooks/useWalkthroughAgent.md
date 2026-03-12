# useWalkthroughAgent Hook

## Overview

The `useWalkthroughAgent` hook provides voice-guided exploration functionality, connecting to a customizable walkthrough mode with a custom system prompt. It features sophisticated audio intensity tracking for visual feedback during conversations.

## Connection to Backend

- **WebSocket Endpoint**: `ws://<API_BASE_URL>/api/v1/live/walkthrough`
- **Query Parameters**: Supports `system_prompt` via URL query string (configured in the component using this hook)
- **Audio Format**: Same as useGeminiLive (PCM 16-bit, 16kHz input, 24kHz output)

## Key Functions

### `start()`

Initiates a walkthrough session by:
1. Creating a WebSocket connection to the walkthrough endpoint
2. Setting up audio context and microphone capture
3. Configuring audio processing with intensity tracking
4. Initializing visual intensity animation loop

**Throws**: Error if connection fails or microphone access is denied

### `stop()`

Gracefully terminates the session by:
1. Closing the WebSocket connection
2. Stopping all microphone tracks
3. Disconnecting audio processor
4. Closing audio context
5. Resetting all intensity refs to zero

## State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether the WebSocket is connected |
| `isStarting` | `boolean` | Whether a connection is in progress |
| `inputIntensityRef` | `Ref<number>` | Current microphone input intensity |
| `outputIntensityRef` | `Ref<number>` | Current audio output intensity |
| `visualIntensityRef` | `Ref<number>` | Combined intensity for UI visualization |

## Intensity Tracking System

The hook implements a sophisticated intensity smoothing system:

### Input Intensity
- Captured from microphone via `onaudioprocess` event
- Smoothed with attack: 0.9, release: 0.22
- Represents user's voice activity

### Output Intensity
- Calculated from received audio data
- Smoothed with attack: 0.82, release: 0.16
- Represents Gemini's voice output

### Visual Intensity
- Combined max of input and output
- Smoothed with attack: 0.78, release: 0.14
- Used for UI visualizations (waveforms, indicators)

## Audio Processing Pipeline

1. **Microphone Capture**: Captures audio at device sample rate
2. **Intensity Calculation**: Calculates RMS intensity from input buffer
3. **Smoothing**: Applies attack/release smoothing for natural visualization
4. **Resampling**: Converts to 16kHz for backend transmission
5. **Encoding**: Converts to PCM 16-bit
6. **Transmission**: Sends via WebSocket binary frame

### Playback Tracking
The hook maintains a `playbackSegmentsRef` array to track active audio playback:
- Each segment stores: `{ startTime, endTime, intensity }`
- Segments are filtered to keep only recent ones (ending > now - 0.08s)
- Used to calculate active output level for visualization

## Message Handling

Unlike `useGeminiLive`, this hook does **not** maintain a messages state. It focuses purely on:
- Audio streaming (input → backend)
- Audio playback (backend → output speakers)
- Visual intensity feedback

System messages and errors are logged to console rather than displayed in UI.

## Usage Example

```tsx
import { useWalkthroughAgent } from '../hooks/useWalkthroughAgent'

function WalkthroughModal() {
  const {
    isConnected,
    isStarting,
    inputIntensityRef,
    outputIntensityRef,
    visualIntensityRef,
    start,
    stop,
  } = useWalkthroughAgent()

  return (
    <div>
      <button onClick={start} disabled={isStarting}>
        Start Walkthrough
      </button>
      <button onClick={stop} disabled={!isConnected}>
        End Walkthrough
      </button>
      
      {/* Visual intensity indicators */}
      <div className="input-level">
        You: {inputIntensityRef.current}
      </div>
      <div className="output-level">
        Guide: {outputIntensityRef.current}
      </div>
      <div className="visual-level">
        Combined: {visualIntensityRef.current}
      </div>
    </div>
  )
}
```

## Custom System Prompt

The walkthrough mode supports custom system prompts via query parameters. To use:
1. Add `?system_prompt=your_prompt_here` to the walkthrough WebSocket URL in the component
2. The backend will use this prompt for the Gemini session

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
- `smoothIntensity()` - Apply attack/release smoothing
