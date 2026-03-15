/**
 * Walkthrough transport types.
 *
 * These types model the normalized event/state contract between the
 * walkthrough backend (`/api/v1/live/walkthrough`) and the frontend hook.
 */

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

export type WalkthroughTranscriptRole = 'user' | 'gemini'

export interface WalkthroughTranscriptTurn {
  role: WalkthroughTranscriptRole
  content: string
}

/**
 * An inline tool-activity entry that can appear in the transcript list
 * between user and Gemini turns so grounding visibility is contextual.
 */
export interface WalkthroughToolActivityEntry {
  role: 'tool_activity'
  status: WalkthroughToolStatus
  toolName: string | null
}

/** A single item in the transcript list — either a speech turn or inline tool activity. */
export type WalkthroughTranscriptItem = WalkthroughTranscriptTurn | WalkthroughToolActivityEntry

// ---------------------------------------------------------------------------
// Tool activity
// ---------------------------------------------------------------------------

export type WalkthroughToolStatus = 'idle' | 'searching' | 'complete' | 'no_results' | 'error'

export interface WalkthroughToolActivity {
  status: WalkthroughToolStatus
  toolName: string | null
}

// ---------------------------------------------------------------------------
// Connection / session status
// ---------------------------------------------------------------------------

export type WalkthroughConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'degraded'

// ---------------------------------------------------------------------------
// Inbound websocket event shapes (server → client)
// ---------------------------------------------------------------------------

/** Transcript text event — carries a role and content string. */
export interface WalkthroughTextEvent {
  type: 'text'
  role: 'user' | 'gemini'
  content: string
}

/** Audio data event — hex-encoded PCM16. */
export interface WalkthroughAudioEvent {
  type: 'audio'
  content: string
}

/** Tool call has started (grounding lookup begins). */
export interface WalkthroughToolCallStartEvent {
  type: 'tool_call_start'
  name: string
}

/** Tool call completed with a result. */
export interface WalkthroughToolCallEvent {
  type: 'tool_call'
  name: string
  args: Record<string, unknown>
  result: unknown
}

/** Gemini's response turn is finished. */
export interface WalkthroughTurnCompleteEvent {
  type: 'turn_complete'
}

/** Audio generation finished (before turn_complete). */
export interface WalkthroughGenerationCompleteEvent {
  type: 'generation_complete'
}

/** User interrupted Gemini mid-response. */
export interface WalkthroughInterruptedEvent {
  type: 'interrupted'
}

/** Error or degraded connection event. */
export interface WalkthroughErrorEvent {
  type: 'error'
  content?: string
  error?: string
}

/** Session resumption handle update. */
export interface WalkthroughResumptionEvent {
  type: 'session_resumption_update'
  handle: string
  resumable: boolean
}

export type WalkthroughServerEvent =
  | WalkthroughTextEvent
  | WalkthroughAudioEvent
  | WalkthroughToolCallStartEvent
  | WalkthroughToolCallEvent
  | WalkthroughTurnCompleteEvent
  | WalkthroughGenerationCompleteEvent
  | WalkthroughInterruptedEvent
  | WalkthroughErrorEvent
  | WalkthroughResumptionEvent
