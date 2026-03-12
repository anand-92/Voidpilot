import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { Message, MessageRole } from './useGeminiLive.ts'

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

const DEFAULT_BRAINSTORM_FLASH_MODEL: BrainstormFlashModel =
  'gemini-3.1-flash-lite'

const DEFAULT_ENABLED_TOOLS: BrainstormToolId[] = [
  'save_brainstorm_artifact',
  'generate_brainstorm_image',
  'generate_brainstorm_video',
]

export type BrainstormArtifact = {
  filename: string
  content: string
  mimeType: string
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

function createArtifact(filename: string, data: string, type: string, label?: string, text?: string): BrainstormArtifact {
  return {
    filename,
    content: data,
    mimeType: ARTIFACT_MIME_TYPES[type] || 'text/markdown',
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFlashModel, setSelectedFlashModel] = useState<BrainstormFlashModel>(
    DEFAULT_BRAINSTORM_FLASH_MODEL,
  )
  const [selectedTools, setSelectedTools] = useState<BrainstormToolId[]>(
    DEFAULT_ENABLED_TOOLS,
  )
  const intensityRef = useRef(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)
  const sessionHandleRef = useRef<string | null>(null)
  const turnBoundaryRef = useRef(false)
  const toolCallPendingRef = useRef(false)
  const toolResponseTurnRef = useRef(false)

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

      if (canAppend) {
        const updated = [...previous]
        updated[updated.length - 1] = { ...last, content: last.content + content }
        return updated
      }
      return [...previous, { role, content, isToolResponse: shouldAppend ?? undefined }]
    })
  }, [])

  const upsertArtifact = useCallback((filename: string, artifact: BrainstormArtifact) => {
    setArtifacts((prev) => {
      const next = new Map(prev)
      next.set(filename, artifact)
      return next
    })
  }, [])

  const handleArtifactMessage = useCallback((data: Record<string, string>) => {
    const { filename, content, data: mediaData, label, text } = data
    // Backend sends "content" for text artifacts but "data" for media (image/video)
    const artifactContent = content ?? mediaData
    const artifact = createArtifact(filename, artifactContent, data.type, label, text)
    upsertArtifact(filename, artifact)
    setIsGenerating(false)
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
    intensityRef.current = 0
    nextPlayTimeRef.current = 0
  }, [])

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
    try {
      if (wsRef.current || streamRef.current) {
        stop()
      }

      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/brainstorm`)

      ws.onopen = () => {
        console.log('Connected to brainstorm endpoint')
        setIsConnected(true)
        addMessage('Connected to Brainstorm Mode', 'system')

        ws.send(
          JSON.stringify({
            type: 'session_config',
            handle: sessionHandleRef.current,
            flash_model: selectedFlashModel,
            enabled_tools: selectedTools,
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
            break
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
  }, [addMessage, selectedFlashModel, selectedTools, stop, startToolCallTurn, handleArtifactMessage, handleTextMessage, handleAudioMessage, setupAudioProcessing])

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

  return {
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
  }
}
