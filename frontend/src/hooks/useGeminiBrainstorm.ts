import { useCallback, useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
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
} from '../utils/audio.ts'
import type { BrainstormType } from '@/components/brainstorm/ModeSelectionScreen'
import type { Message, MessageRole } from '@/types/messages'
import {
  artifactToBlob,
  blobToArtifactContent,
  downloadBlob,
} from '@/lib/brainstormArtifactFiles'
import {
  downloadBrainstormArtifact,
  loadBrainstormArtifacts,
  loadBrainstormTurns,
  saveBrainstormArtifact,
  saveBrainstormTurns,
  updateBrainstormSessionTitle,
  type PersistedArtifactMetadata,
  type PersistedTurn,
} from '@/lib/brainstormPersistenceApi'

export const BRAINSTORM_FLASH_MODEL_OPTIONS = [
  { value: 'gemini-3.1-flash-lite', label: 'LITE' },
  { value: 'gemini-3-flash', label: 'FLASH' },
  { value: 'gemini-3.1-pro', label: 'PRO' },
] as const

export const BRAINSTORM_TOOL_OPTIONS = [
  { id: 'save_brainstorm_artifact', label: 'Artifact' },
  { id: 'generate_brainstorm_image', label: 'Image' },
  { id: 'generate_brainstorm_video', label: 'Video' },
] as const

export type BrainstormToolId = (typeof BRAINSTORM_TOOL_OPTIONS)[number]['id']

export type BrainstormFlashModel =
  (typeof BRAINSTORM_FLASH_MODEL_OPTIONS)[number]['value']

export type BrainstormSessionMode = 'guest' | 'persisted'

const DEFAULT_BRAINSTORM_FLASH_MODEL: BrainstormFlashModel =
  'gemini-3.1-flash-lite'

const DEFAULT_ENABLED_TOOLS: BrainstormToolId[] = [
  'save_brainstorm_artifact',
  'generate_brainstorm_image',
  'generate_brainstorm_video',
]

export type BrainstormArtifact = {
  artifactId?: string
  sessionId?: string
  filename: string
  content: string | null
  mimeType: string
  sizeBytes?: number
  label?: string
  updatedAt: string
  text?: string  // Interleaved text from image generation
}

// Artifact type to MIME type mapping
const ARTIFACT_MIME_TYPES: Record<string, string> = {
  brainstorm_artifact: 'text/markdown',
  brainstorm_image: 'image/png',
  brainstorm_video: 'video/mp4',
}

/**
 * Generate a short session title from the first substantive user messages.
 * Returns null if there's not enough content to generate a meaningful title.
 */
function generateSessionTitle(messages: Message[]): string | null {
  const userMessages = messages.filter(
    (m) => m.role === 'user' && m.content.trim().length > 3,
  )
  if (userMessages.length === 0) return null

  // Use the first user message content, truncated
  const firstContent = userMessages[0].content.trim()
  const maxLength = 60
  if (firstContent.length <= maxLength) return firstContent
  return firstContent.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}

/**
 * Convert current messages to the persisted turn format.
 * Filters out system messages since they are transient.
 */
function messagesToPersistedTurns(messages: Message[]): PersistedTurn[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const turn: PersistedTurn = { role: m.role, content: m.content }
      if (m.isToolResponse) {
        turn.isToolResponse = true
      }
      return turn
    })
}

function createArtifact(filename: string, data: string, type: string, label?: string, text?: string): BrainstormArtifact {
  return {
    filename,
    content: data,
    mimeType: ARTIFACT_MIME_TYPES[type] || 'text/markdown',
    sizeBytes: undefined,
    label,
    updatedAt: new Date().toISOString(),
    text,
  }
}

export function useGeminiBrainstorm() {
  const [isConnected, setIsConnected] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [artifacts, setArtifacts] = useState<Map<string, BrainstormArtifact>>(new Map())
  const [artifactLoadStates, setArtifactLoadStates] = useState<Record<string, 'loading' | 'error'>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionMode, setSessionMode] = useState<BrainstormSessionMode>('guest')
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)
  const [selectedFlashModel, setSelectedFlashModel] = useState<BrainstormFlashModel>(
    DEFAULT_BRAINSTORM_FLASH_MODEL,
  )
  const [selectedTools, setSelectedTools] = useState<BrainstormToolId[]>(
    DEFAULT_ENABLED_TOOLS,
  )
  const [brainstormType, setBrainstormType] = useState<BrainstormType | null>(null)
  const [autoStartError, setAutoStartError] = useState<string | null>(null)
  const intensityRef = useRef(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)
  const sessionHandleRef = useRef<string | null>(null)
  const activeSessionIdRef = useRef<string | null>(null)
  const sessionModeRef = useRef<BrainstormSessionMode>('guest')
  const brainstormTypeRef = useRef<BrainstormType | null>(null)
  const turnBoundaryRef = useRef(false)
  const toolCallPendingRef = useRef(false)
  const toolResponseTurnRef = useRef(false)
  const titleSavedRef = useRef(false)
  const savePendingRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const artifactsRef = useRef<Map<string, BrainstormArtifact>>(new Map())
  const artifactLoadPromisesRef = useRef<Map<string, Promise<BrainstormArtifact | null>>>(new Map())

  const setArtifactLoadState = useCallback(
    (filename: string, nextState: 'loading' | 'error' | null) => {
      setArtifactLoadStates((previous) => {
        if (nextState === null) {
          if (!(filename in previous)) {
            return previous
          }

          const next = { ...previous }
          delete next[filename]
          return next
        }

        return {
          ...previous,
          [filename]: nextState,
        }
      })
    },
    [],
  )

  useEffect(() => {
    artifactsRef.current = artifacts
  }, [artifacts])

  const startToolCallTurn = useCallback(() => {
    turnBoundaryRef.current = true
    toolResponseTurnRef.current = true
  }, [])

  const addMessage = useCallback((content: string, role: MessageRole) => {
    setMessages((previous) => {
      const last = previous[previous.length - 1]
      const isNewTurn = turnBoundaryRef.current && role === 'gemini'

      if (isNewTurn) {
        turnBoundaryRef.current = false
        if (toolCallPendingRef.current) {
          toolResponseTurnRef.current = true
          toolCallPendingRef.current = false
        }
      }

      const shouldAppend = role === 'gemini' && toolResponseTurnRef.current
      const canAppend =
        !isNewTurn &&
        last?.role === role &&
        !!last.isToolResponse === shouldAppend

      let next: Message[]
      if (canAppend) {
        next = [...previous]
        next[next.length - 1] = { ...last, content: last.content + content }
      } else {
        next = [...previous, { role, content, isToolResponse: shouldAppend ?? undefined }]
      }
      messagesRef.current = next
      return next
    })
  }, [])

  const upsertArtifact = useCallback((filename: string, artifact: BrainstormArtifact) => {
    setArtifacts((prev) => {
      const next = new Map(prev)
      next.set(filename, artifact)
      artifactsRef.current = next
      return next
    })
    setArtifactLoadState(filename, null)
  }, [setArtifactLoadState])

  const handleArtifactMessage = useCallback((data: Record<string, string>) => {
    const { filename, content, data: mediaData, label, text } = data
    // Backend sends "content" for text artifacts but "data" for media (image/video)
    const artifactContent = content ?? mediaData
    const artifact = createArtifact(filename, artifactContent, data.type, label, text)
    upsertArtifact(filename, artifact)
    setIsGenerating(false)

    // Persist artifact to backend for signed-in sessions.
    // Capture the session id at artifact arrival time so delayed completions
    // always target the originating session, even if the user switches sessions.
    const originatingSessionId = activeSessionIdRef.current
    const originatingMode = sessionModeRef.current
    if (originatingSessionId && originatingMode === 'persisted') {
      void saveBrainstormArtifact(originatingSessionId, {
        filename,
        content: artifactContent,
        mimeType: artifact.mimeType,
        label,
        text,
      }).catch((error: unknown) => {
        console.error('Failed to persist brainstorm artifact:', error)
      })
    }
  }, [upsertArtifact])

  const handleTextMessage = useCallback((data: { content: string; role: string }) => {
    const role: MessageRole = data.role === 'user' ? 'user' : 'gemini'
    addMessage(data.content, role)
  }, [addMessage])

  const handleAudioMessage = useCallback((data: { content: string }) => {
    const pcmData = decodeHexAudio(data.content)
    if (pcmData && pcmData.length > 0 && audioContextRef.current) {
      const floatData = pcm16ToFloat32(pcmData)
      intensityRef.current = calculateIntensity(floatData)
      scheduleAudioPlayback(audioContextRef.current, floatData, nextPlayTimeRef)
    }
  }, [])

  const resetWorkspaceState = useCallback(() => {
    setMessages([])
    setArtifacts(new Map())
    artifactsRef.current = new Map()
    setArtifactLoadStates({})
    setIsGenerating(false)
    setSessionTitle(null)
    setBrainstormType(null)
    messagesRef.current = []
    sessionHandleRef.current = null
    brainstormTypeRef.current = null
    turnBoundaryRef.current = false
    toolCallPendingRef.current = false
    toolResponseTurnRef.current = false
    titleSavedRef.current = false
    savePendingRef.current = false
    artifactLoadPromisesRef.current.clear()
    intensityRef.current = 0
    nextPlayTimeRef.current = 0
  }, [])

  /**
   * Persist the current transcript state for the active signed-in session.
   * Also generates and saves a title if one hasn't been saved yet.
   */
  const persistCurrentTurns = useCallback((currentMessages: Message[]) => {
    const sid = activeSessionIdRef.current
    const mode = sessionModeRef.current
    if (!sid || mode !== 'persisted' || savePendingRef.current) return

    const turns = messagesToPersistedTurns(currentMessages)
    if (turns.length === 0) return

    savePendingRef.current = true
    void saveBrainstormTurns(sid, turns)
      .then(() => {
        // Generate and save title on first substantive save
        if (!titleSavedRef.current) {
          const generatedTitle = generateSessionTitle(currentMessages)
          if (generatedTitle) {
            titleSavedRef.current = true
            setSessionTitle(generatedTitle)
            void updateBrainstormSessionTitle(sid, generatedTitle).catch(
              (error: unknown) => {
                console.error('Failed to save session title:', error)
              },
            )
          }
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to save brainstorm turns:', error)
      })
      .finally(() => {
        savePendingRef.current = false
      })
  }, [])

  /**
   * Load previously saved turns for a signed-in session to restore history.
   */
  const loadSavedTurns = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      const turns = await loadBrainstormTurns(sessionId)
      if (turns.length === 0) return []
      return turns.map((turn) => ({
        role: turn.role as MessageRole,
        content: turn.content,
        isToolResponse: turn.isToolResponse ?? undefined,
      }))
    } catch (error) {
      console.error('Failed to load saved turns:', error)
      return []
    }
  }, [])

  /**
   * Load saved artifact metadata for a signed-in session.
   * Actual content stays deferred until preview/download time.
   */
  const loadSavedArtifacts = useCallback(async (sessionId: string): Promise<Map<string, BrainstormArtifact>> => {
    try {
      const metadataList = await loadBrainstormArtifacts(sessionId)
      if (metadataList.length === 0) return new Map()

      const restoredArtifacts = new Map<string, BrainstormArtifact>()

      metadataList.forEach((meta: PersistedArtifactMetadata) => {
        const artifact: BrainstormArtifact = {
          artifactId: meta.artifactId,
          sessionId,
          filename: meta.filename,
          content: null,
          mimeType: meta.mimeType,
          sizeBytes: meta.sizeBytes ?? undefined,
          label: meta.label ?? undefined,
          updatedAt: meta.createdAt,
          text: meta.text ?? undefined,
        }

        restoredArtifacts.set(meta.filename, artifact)
      })

      return restoredArtifacts
    } catch (error) {
      console.error('Failed to load saved artifacts:', error)
      return new Map()
    }
  }, [])

  const ensureArtifactContent = useCallback(async (filename: string) => {
    const artifact = artifactsRef.current.get(filename)
    if (!artifact) {
      return null
    }

    if (artifact.content !== null) {
      return artifact
    }

    if (!artifact.sessionId || !artifact.artifactId) {
      return artifact
    }

    const existingLoad = artifactLoadPromisesRef.current.get(filename)
    if (existingLoad) {
      return existingLoad
    }

    setArtifactLoadState(filename, 'loading')

    const loadPromise = downloadBrainstormArtifact(
      artifact.sessionId,
      artifact.artifactId,
    )
      .then(async ({ blob, mimeType }) => {
        const content = await blobToArtifactContent(blob, mimeType)

        let loadedArtifact: BrainstormArtifact | null = null
        setArtifacts((previous) => {
          const currentArtifact = previous.get(filename)
          if (!currentArtifact) {
            return previous
          }

          loadedArtifact = {
            ...currentArtifact,
            content,
            mimeType,
            sizeBytes: currentArtifact.sizeBytes ?? blob.size,
          }

          const next = new Map(previous)
          next.set(filename, loadedArtifact)
          artifactsRef.current = next
          return next
        })

        setArtifactLoadState(filename, null)
        return loadedArtifact
      })
      .catch((error: unknown) => {
        setArtifactLoadState(filename, 'error')
        console.error(`Failed to load artifact ${filename}:`, error)
        return null
      })
      .finally(() => {
        artifactLoadPromisesRef.current.delete(filename)
      })

    artifactLoadPromisesRef.current.set(filename, loadPromise)
    return loadPromise
  }, [setArtifactLoadState])

  const downloadArtifact = useCallback(async (filename: string) => {
    const artifact = artifactsRef.current.get(filename)
    if (!artifact) {
      return
    }

    if (artifact.content !== null) {
      downloadBlob(artifactToBlob(artifact), artifact.filename)
      return
    }

    if (!artifact.sessionId || !artifact.artifactId) {
      return
    }

    const { blob, filename: downloadFilename } = await downloadBrainstormArtifact(
      artifact.sessionId,
      artifact.artifactId,
    )
    downloadBlob(blob, downloadFilename)
  }, [])

  const downloadAllArtifacts = useCallback(async () => {
    const zip = new JSZip()

    for (const artifact of artifactsRef.current.values()) {
      if (artifact.content !== null) {
        zip.file(artifact.filename, artifactToBlob(artifact))
        continue
      }

      if (!artifact.sessionId || !artifact.artifactId) {
        continue
      }

      const { blob } = await downloadBrainstormArtifact(
        artifact.sessionId,
        artifact.artifactId,
      )
      zip.file(artifact.filename, blob)
    }

    const archive = await zip.generateAsync({ type: 'blob' })
    downloadBlob(archive, 'brainstorm-artifacts.zip')
  }, [])

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
    audioContextRef.current?.close()
    audioContextRef.current = null
    setIsConnected(false)
    setIsStarting(false)
    setIsGenerating(false)
    turnBoundaryRef.current = false
    toolCallPendingRef.current = false
    toolResponseTurnRef.current = false
    intensityRef.current = 0
    nextPlayTimeRef.current = 0
  }, [])

  const updateBrainstormType = useCallback((type: BrainstormType | null) => {
    brainstormTypeRef.current = type
    setBrainstormType(type)
  }, [])

  const prepareGuestWorkspace = useCallback(() => {
    stop()
    resetWorkspaceState()
    activeSessionIdRef.current = null
    sessionModeRef.current = 'guest'
    setActiveSessionId(null)
    setSessionMode('guest')
  }, [resetWorkspaceState, stop])

  const preparePersistedWorkspace = useCallback(
    async (
      sessionId: string,
      options?: { title?: string; restoreTurns?: boolean; brainstormType?: BrainstormType },
    ) => {
      stop()
      resetWorkspaceState()
      activeSessionIdRef.current = sessionId
      sessionModeRef.current = 'persisted'
      setActiveSessionId(sessionId)
      setSessionMode('persisted')

      // Restore brainstorm type if provided (from session record)
      if (options?.brainstormType) {
        brainstormTypeRef.current = options.brainstormType
        setBrainstormType(options.brainstormType)
      }

      // Restore session title if provided
      if (options?.title && options.title !== 'Untitled session') {
        setSessionTitle(options.title)
        titleSavedRef.current = true
      }

      // Restore saved turns and artifacts for existing sessions
      if (options?.restoreTurns) {
        const [savedMessages, savedArtifacts] = await Promise.all([
          loadSavedTurns(sessionId),
          loadSavedArtifacts(sessionId),
        ])
        if (savedMessages.length > 0) {
          messagesRef.current = savedMessages
          setMessages(savedMessages)
        }
        if (savedArtifacts.size > 0) {
          setArtifacts(savedArtifacts)
        }
      }
    },
    [resetWorkspaceState, stop, loadSavedTurns, loadSavedArtifacts],
  )

  const setupAudioProcessing = useCallback(() => {
    if (!streamRef.current || !audioContextRef.current) return

    const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
    processorRef.current = audioContextRef.current.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1)

    const sourceRate = audioContextRef.current.sampleRate
    processorRef.current.onaudioprocess = (event) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      const inputData = event.inputBuffer.getChannelData(0)
      intensityRef.current = calculateIntensity(inputData)

      const resampledData = resampleAudio(inputData, sourceRate, MIC_TARGET_RATE)
      const pcmData = float32ToPcm16(resampledData)
      wsRef.current.send(pcmData.buffer)
    }

    source.connect(processorRef.current)
    processorRef.current.connect(audioContextRef.current.destination)
    nextPlayTimeRef.current = 0
  }, [])

  const start = useCallback(async () => {
    setIsStarting(true)
    setAutoStartError(null)
    try {
      if (wsRef.current || streamRef.current) {
        stop()
      }

      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/brainstorm`)

      ws.onopen = () => {
        console.log('Connected to brainstorm endpoint')
        setIsConnected(true)
        const modeName = brainstormTypeRef.current === 'creative_spark' ? 'Creative Spark' : 'Open Studio'
        addMessage(`Connected to ${modeName}`, 'system')

        ws.send(
          JSON.stringify({
            type: 'session_config',
            handle: sessionHandleRef.current,
            session_id: activeSessionIdRef.current,
            session_mode: sessionModeRef.current,
            flash_model: selectedFlashModel,
            enabled_tools: selectedTools,
            brainstorm_type: brainstormTypeRef.current,
          }),
        )
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const dataType = data.type

        // Handle artifact types uniformly
        if (dataType === 'brainstorm_artifact' || dataType === 'brainstorm_image' || dataType === 'brainstorm_video') {
          handleArtifactMessage(data as Record<string, string>)
          return
        }

        switch (dataType) {
          case 'text':
            handleTextMessage(data)
            break
          case 'audio':
            handleAudioMessage(data)
            break
          case 'session_resumption_update':
            if (data.handle) {
              sessionHandleRef.current = data.handle
            }
            break
          case 'interrupted':
            nextPlayTimeRef.current = 0
            break
          case 'tool_call_start':
            setIsGenerating(true)
            startToolCallTurn()
            break
          case 'tool_call':
            setIsGenerating(false)
            toolCallPendingRef.current = true
            break
          case 'turn_complete':
            turnBoundaryRef.current = true
            toolResponseTurnRef.current = false
            // Persist transcript state after each completed turn (signed-in only)
            persistCurrentTurns(messagesRef.current)
            break
          case 'error': {
            const errorContent = data.content ?? 'Unknown error'
            addMessage(`Error: ${errorContent}`, 'system')
            // Flag auto-start errors for Creative Spark recovery UI
            if (brainstormTypeRef.current === 'creative_spark') {
              setAutoStartError(errorContent)
            }
            break
          }
        }
      }

      ws.onerror = (error) => {
        console.error('Brainstorm WebSocket error:', error)
        addMessage('Connection error', 'system')
      }

      ws.onclose = () => {
        console.log('Brainstorm WebSocket closed')
        setIsConnected(false)
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
      streamRef.current = await requestMicrophone()
      setupAudioProcessing()
    } catch (error) {
      console.error('Brainstorm start error:', error)
      addMessage('Error: ' + (error as Error).message, 'system')
      stop()
      throw error
    } finally {
      setIsStarting(false)
    }
  }, [addMessage, selectedFlashModel, selectedTools, stop, startToolCallTurn, handleArtifactMessage, handleTextMessage, handleAudioMessage, setupAudioProcessing, persistCurrentTurns])

  const sendText = useCallback(
    (text: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'text', content: text }))
        addMessage(text, 'user')
      }
    },
    [addMessage],
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  const clearAutoStartError = useCallback(() => {
    setAutoStartError(null)
  }, [])

  return {
    isConnected,
    isStarting,
    messages,
    artifacts,
    artifactLoadStates,
    isGenerating,
    activeSessionId,
    sessionMode,
    sessionTitle,
    brainstormType,
    autoStartError,
    clearAutoStartError,
    intensityRef,
    selectedFlashModel,
    setSelectedFlashModel,
    selectedTools,
    setSelectedTools,
    updateBrainstormType,
    prepareGuestWorkspace,
    preparePersistedWorkspace,
    ensureArtifactContent,
    downloadArtifact,
    downloadAllArtifacts,
    start,
    stop,
    sendText,
  }
}
