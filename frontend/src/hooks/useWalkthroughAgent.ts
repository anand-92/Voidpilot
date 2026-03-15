import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type BrainstormVoice,
  BRAINSTORM_VOICE_OPTIONS,
} from '@/hooks/useGeminiBrainstorm'
import {
  API_BASE_URL,
  AUDIO_BUFFER_SIZE,
  MIC_TARGET_RATE,
  calculateIntensity,
  createAudioContext,
  decodeHexAudio,
  float32ToPcm16,
  pcm16ToFloat32,
  requestMicrophone,
  resampleAudio,
  scheduleAudioPlayback,
  smoothIntensity,
  stopScheduledAudioPlayback,
  type ActiveAudioPlaybackRef,
} from '../utils/audio.ts'
import type {
  WalkthroughConnectionStatus,
  WalkthroughToolActivity,
  WalkthroughToolStatus,
  WalkthroughTranscriptItem,
  WalkthroughTranscriptRole,
  WalkthroughTranscriptTurn,
  WalkthroughServerEvent,
} from '../types/walkthrough.ts'

// ---------------------------------------------------------------------------
// Text-chunk merging for live transcriptions.
// Preserve explicit whitespace from Gemini because transcript chunks can split
// inside words (for example, "Ge" + "mini"), which makes synthesized spaces
// much more harmful than occasional missing boundaries.
// ---------------------------------------------------------------------------

const MESSAGE_OVERLAP_LIMIT = 120
const MIN_MESSAGE_OVERLAP = 2
const SPACE_PREFIX_CHARS = new Set(['.', '!', '?', ',', ':', ';', ')', ']', '}', '"', '\u201D'])

function isWordBoundaryChar(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char)
}

function findMessageOverlap(existing: string, next: string): number {
  const maxOverlap = Math.min(existing.length, next.length, MESSAGE_OVERLAP_LIMIT)
  for (let size = maxOverlap; size >= MIN_MESSAGE_OVERLAP; size -= 1) {
    const prefix = next.slice(0, size)
    if (
      existing.endsWith(prefix)
      && (size >= existing.length || !isWordBoundaryChar(existing[existing.length - size - 1]))
      && (size >= next.length || !isWordBoundaryChar(next[size]))
    ) {
      return size
    }
  }
  return 0
}

function needsMessageSeparator(existing: string, next: string): boolean {
  if (!existing || !next) return false
  const prev = existing.at(-1)
  const nxt = next[0]
  if (!prev || !nxt) return false
  if (/\s/u.test(prev) || /\s/u.test(nxt)) return false
  return SPACE_PREFIX_CHARS.has(prev) && isWordBoundaryChar(nxt)
}

function mergeTranscriptContent(existing: string, next: string): string {
  if (!existing) return next
  if (!next) return existing
  const overlap = findMessageOverlap(existing, next)
  const suffix = next.slice(overlap)
  if (!suffix) return existing
  const sep = needsMessageSeparator(existing, suffix) ? ' ' : ''
  return existing + sep + suffix
}

// ---------------------------------------------------------------------------
// Tool result classification
// ---------------------------------------------------------------------------

const NO_RESULTS_PATTERNS = [
  'no results found',
  'no results',
  'no relevant',
]

const ERROR_PATTERNS = [
  'error:',
  'error executing',
  'unsupported tool',
]

function classifyToolResult(result: unknown): WalkthroughToolStatus {
  const text = typeof result === 'string'
    ? result
    : typeof result === 'object' && result !== null && 'result' in result
      ? String((result as Record<string, unknown>).result)
      : String(result)

  const lower = text.toLowerCase()
  if (ERROR_PATTERNS.some((p) => lower.includes(p))) return 'error'
  if (NO_RESULTS_PATTERNS.some((p) => lower.includes(p))) return 'no_results'
  return 'complete'
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWalkthroughAgent() {
  const [selectedVoice, setSelectedVoice] = useState<BrainstormVoice>('Despina')

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<WalkthroughConnectionStatus>('disconnected')

  // Transcript state (session-only — cleared on close)
  const [transcript, setTranscript] = useState<WalkthroughTranscriptItem[]>([])
  const transcriptRef = useRef<WalkthroughTranscriptItem[]>([])

  // Tool activity state
  const [toolActivity, setToolActivity] = useState<WalkthroughToolActivity>({
    status: 'idle',
    toolName: null,
  })

  // Error state for degraded/error conditions
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Audio intensity refs (same as before)
  const inputIntensityRef = useRef(0)
  const outputIntensityRef = useRef(0)
  const visualIntensityRef = useRef(0)
  const playbackSegmentsRef = useRef<Array<{ startTime: number; endTime: number; intensity: number }>>([])

  // WebSocket and audio refs
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)
  const activePlaybackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set()) as ActiveAudioPlaybackRef

  // Turn tracking for transcript merging
  const turnBoundaryRef = useRef(true)

  // Derived booleans for backward compatibility
  const isConnected = connectionStatus === 'connected'
  const isStarting = connectionStatus === 'connecting'

  // ---------------------------------------------------------------------------
  // Audio intensity smoothing loop (unchanged)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let frameId = 0

    const tick = () => {
      inputIntensityRef.current = smoothIntensity(inputIntensityRef.current, 0, { release: 0.12 })

      const audioContext = audioContextRef.current
      if (audioContext) {
        const now = audioContext.currentTime
        playbackSegmentsRef.current = playbackSegmentsRef.current.filter(
          (segment) => segment.endTime > now - 0.08,
        )
      } else if (playbackSegmentsRef.current.length > 0) {
        playbackSegmentsRef.current = []
      }

      const activeOutputLevel = audioContext
        ? playbackSegmentsRef.current.reduce((peak, segment) => {
            const overlapsPlaybackWindow =
              segment.endTime > audioContext.currentTime - 0.05
              && segment.startTime < audioContext.currentTime + 0.16

            return overlapsPlaybackWindow ? Math.max(peak, segment.intensity) : peak
          }, 0)
        : 0

      if (activeOutputLevel > 0) {
        outputIntensityRef.current = smoothIntensity(
          outputIntensityRef.current,
          activeOutputLevel,
          { attack: 0.62, release: 0.12 },
        )
      } else {
        outputIntensityRef.current = smoothIntensity(outputIntensityRef.current, 0, { release: 0.1 })
      }

      const combinedLevel = Math.max(inputIntensityRef.current, outputIntensityRef.current)
      visualIntensityRef.current = smoothIntensity(visualIntensityRef.current, combinedLevel, {
        attack: 0.78,
        release: 0.14,
      })

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Transcript helpers
  // ---------------------------------------------------------------------------

  const addTranscriptTurn = useCallback((content: string, role: WalkthroughTranscriptRole) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1]
      const isNewTurn = turnBoundaryRef.current

      if (isNewTurn) {
        turnBoundaryRef.current = false
      }

      // Append to the last turn if same role, not a new turn boundary, and last is a speech turn
      const canAppend = !isNewTurn && last?.role === role

      let next: WalkthroughTranscriptItem[]
      if (canAppend) {
        const lastTurn = last as WalkthroughTranscriptTurn
        next = [...prev]
        next[next.length - 1] = { ...lastTurn, content: mergeTranscriptContent(lastTurn.content, content) }
      } else {
        next = [...prev, { role, content }]
      }
      transcriptRef.current = next
      return next
    })
  }, [])

  /** Insert an inline tool-activity entry into the transcript list. */
  const addToolActivityEntry = useCallback((status: WalkthroughToolStatus, toolName: string | null) => {
    setTranscript((prev) => {
      const next: WalkthroughTranscriptItem[] = [...prev, { role: 'tool_activity', status, toolName }]
      transcriptRef.current = next
      return next
    })
  }, [])

  /** Update the most recent tool_activity entry in the transcript to a new status. */
  const updateLastToolActivityEntry = useCallback((status: WalkthroughToolStatus) => {
    setTranscript((prev) => {
      // Find the last tool_activity entry
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].role === 'tool_activity') {
          const next = [...prev]
          next[i] = { ...prev[i], status } as WalkthroughTranscriptItem
          transcriptRef.current = next
          return next
        }
      }
      return prev
    })
  }, [])

  const clearScheduledAudioPlayback = useCallback(() => {
    stopScheduledAudioPlayback(activePlaybackSourcesRef)
    nextPlayTimeRef.current = 0
    outputIntensityRef.current = 0
  }, [])

  // ---------------------------------------------------------------------------
  // Stop / cleanup
  // ---------------------------------------------------------------------------

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    processorRef.current?.disconnect()
    processorRef.current = null
    clearScheduledAudioPlayback()
    audioContextRef.current?.close()
    audioContextRef.current = null
    setConnectionStatus('disconnected')
    setToolActivity({ status: 'idle', toolName: null })
    setErrorMessage(null)
    setTranscript([])
    transcriptRef.current = [] as WalkthroughTranscriptItem[]
    inputIntensityRef.current = 0
    outputIntensityRef.current = 0
    visualIntensityRef.current = 0
    nextPlayTimeRef.current = 0
    playbackSegmentsRef.current = []
    turnBoundaryRef.current = true
  }, [clearScheduledAudioPlayback])

  // ---------------------------------------------------------------------------
  // Send typed text through the walkthrough session
  // ---------------------------------------------------------------------------

  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'text', content: text }))
    // Immediately add user turn to transcript
    turnBoundaryRef.current = true
    addTranscriptTurn(text, 'user')
  }, [addTranscriptTurn])

  // ---------------------------------------------------------------------------
  // Start session
  // ---------------------------------------------------------------------------

  const start = useCallback(async () => {
    setConnectionStatus('connecting')
    setErrorMessage(null)
    try {
      if (wsRef.current || streamRef.current) {
        stop()
      }

      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/walkthrough`)

      ws.onopen = () => {
        console.log('Connected to walkthrough agent')
        setConnectionStatus('connected')
        ws.send(
          JSON.stringify({
            type: 'session_config',
            voice_name: selectedVoice,
          }),
        )
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as WalkthroughServerEvent

        switch (data.type) {
          case 'text': {
            const role: WalkthroughTranscriptRole =
              data.role === 'user' ? 'user' : 'gemini'
            addTranscriptTurn(data.content, role)
            break
          }

          case 'audio': {
            const pcmData = decodeHexAudio(data.content)
            if (!pcmData || pcmData.length === 0 || !audioContextRef.current) break

            const floatData = pcm16ToFloat32(pcmData)
            const outputLevel = Math.max(calculateIntensity(floatData), 0.08)
            outputIntensityRef.current = smoothIntensity(outputIntensityRef.current, outputLevel, {
              attack: 0.82,
              release: 0.16,
            })
            const { startTime, endTime } = scheduleAudioPlayback(
              audioContextRef.current,
              floatData,
              nextPlayTimeRef,
              activePlaybackSourcesRef,
            )
            playbackSegmentsRef.current.push({ startTime, endTime, intensity: outputLevel })
            break
          }

          case 'tool_call_start':
            setToolActivity({ status: 'searching', toolName: data.name })
            // Insert inline tool activity into transcript for contextual grounding
            addToolActivityEntry('searching', data.name)
            break

          case 'tool_call': {
            const resultStatus = classifyToolResult(data.result)
            setToolActivity({ status: resultStatus, toolName: data.name })
            // Update the inline tool activity entry to reflect the outcome
            updateLastToolActivityEntry(resultStatus)
            break
          }

          case 'turn_complete':
            turnBoundaryRef.current = true
            // Reset tool activity after turn completes
            setToolActivity((prev) =>
              prev.status !== 'idle' ? { status: 'idle', toolName: null } : prev,
            )
            break

          case 'generation_complete':
            // Gemini finished generating audio for this turn
            break

          case 'interrupted':
            clearScheduledAudioPlayback()
            turnBoundaryRef.current = true
            // Resolve any in-flight tool activity on interrupt
            setToolActivity((prev) => {
              if (prev.status === 'searching') {
                updateLastToolActivityEntry('complete')
                return { status: 'idle', toolName: null }
              }
              return prev
            })
            break

          case 'error': {
            const msg = data.content ?? data.error ?? 'Unknown error'
            setErrorMessage(msg)
            setConnectionStatus('degraded')
            setToolActivity((prev) =>
              prev.status === 'searching'
                ? { status: 'error', toolName: prev.toolName }
                : prev,
            )
            // Update inline tool activity if a search was in progress
            setTranscript((prev) => {
              for (let i = prev.length - 1; i >= 0; i -= 1) {
                const item = prev[i]
                if (item.role === 'tool_activity' && item.status === 'searching') {
                  const next = [...prev]
                  next[i] = { ...item, status: 'error' } as WalkthroughTranscriptItem
                  transcriptRef.current = next
                  return next
                }
              }
              return prev
            })
            break
          }

          case 'session_resumption_update':
            // No-op for walkthrough (no resumption needed)
            break
        }
      }

      ws.onerror = (error) => {
        console.error('Walkthrough WebSocket error:', error)
        setConnectionStatus('error')
        setErrorMessage('Connection error')
      }

      ws.onclose = () => {
        console.log('Walkthrough WebSocket closed')
        setConnectionStatus((prev) => {
          // Keep error state as-is (already has retry affordance)
          if (prev === 'error') return prev
          // Degraded + WS closed = promote to error so retry shows
          if (prev === 'degraded') return 'error'
          return 'disconnected'
        })
        // Fill in an error message when the WS close promotes degraded→error
        setErrorMessage((prev) => prev ?? 'Connection lost')
      }

      wsRef.current = ws

      await new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.OPEN) {
          resolve()
        } else {
          const originalOnOpen = ws.onopen
          ws.onopen = (event) => {
            if (originalOnOpen) originalOnOpen.call(ws, event)
            resolve()
          }
        }
      })

      audioContextRef.current = createAudioContext()

      try {
        streamRef.current = await requestMicrophone()
      } catch (micError) {
        console.warn('Microphone access denied or unavailable:', micError)
        // Degrade gracefully — typed fallback remains usable
        setConnectionStatus('degraded')
        setErrorMessage('Microphone unavailable — use typed input instead')
        return
      }

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
      processorRef.current = audioContextRef.current.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1)

      const sourceRate = audioContextRef.current.sampleRate
      processorRef.current.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const inputData = event.inputBuffer.getChannelData(0)
        inputIntensityRef.current = smoothIntensity(
          inputIntensityRef.current,
          calculateIntensity(inputData),
          { attack: 0.9, release: 0.22 },
        )
        const resampledData = resampleAudio(inputData, sourceRate, MIC_TARGET_RATE)
        const pcmData = float32ToPcm16(resampledData)
        wsRef.current.send(pcmData.buffer)
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      nextPlayTimeRef.current = 0
    } catch (error) {
      console.error('Walkthrough start error:', error)
      setConnectionStatus('error')
      setErrorMessage(error instanceof Error ? error.message : String(error))
      stop()
      throw error
    }
  }, [stop, addTranscriptTurn, addToolActivityEntry, updateLastToolActivityEntry, clearScheduledAudioPlayback, selectedVoice])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    // Connection
    connectionStatus,
    isConnected,
    isStarting,
    errorMessage,
    selectedVoice,
    setSelectedVoice,
    availableVoices: BRAINSTORM_VOICE_OPTIONS,

    // Transcript
    transcript,

    // Tool activity
    toolActivity,

    // Actions
    start,
    stop,
    sendText,

    // Audio intensity refs (for visualizer)
    inputIntensityRef,
    outputIntensityRef,
    visualIntensityRef,
  }
}
