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
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
] as const

export type BrainstormFlashModel =
  (typeof BRAINSTORM_FLASH_MODEL_OPTIONS)[number]['value']

const DEFAULT_BRAINSTORM_FLASH_MODEL: BrainstormFlashModel =
  'gemini-3.1-flash-lite'

export type BrainstormArtifact = {
  filename: string
  content: string // markdown text or base64 image data
  mimeType: string // 'text/markdown' or 'image/png'
  label?: string // for images
  updatedAt: string // ISO timestamp
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

  const addMessage = useCallback((content: string, role: MessageRole) => {
    setMessages((previous) => {
      const last = previous[previous.length - 1]
      const isNewTurn = turnBoundaryRef.current && role === 'gemini'
      if (isNewTurn) turnBoundaryRef.current = false

      const isToolResponse = role === 'gemini' && toolResponseTurnRef.current
      const canAppend =
        !isNewTurn &&
        last?.role === role &&
        !!last.isToolResponse === isToolResponse

      if (canAppend) {
        const updated = [...previous]
        updated[updated.length - 1] = { ...last, content: last.content + content }
        return updated
      }
      return [...previous, { role, content, isToolResponse: isToolResponse ?? undefined }]
    })
  }, [])

  const upsertArtifact = useCallback((filename: string, artifact: BrainstormArtifact) => {
    setArtifacts((prev) => {
      const next = new Map(prev)
      next.set(filename, artifact)
      return next
    })
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
          }),
        )
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'brainstorm_artifact') {
          upsertArtifact(data.filename, {
            filename: data.filename,
            content: data.content,
            mimeType: 'text/markdown',
            updatedAt: new Date().toISOString(),
          })
          setIsGenerating(false)
        } else if (data.type === 'brainstorm_image') {
          upsertArtifact(data.filename, {
            filename: data.filename,
            content: data.data,
            mimeType: 'image/png',
            label: data.label,
            updatedAt: new Date().toISOString(),
          })
          setIsGenerating(false)
        } else if (data.type === 'text') {
          const role: MessageRole = data.role === 'user' ? 'user' : 'gemini'
          addMessage(data.content, role)
        } else if (data.type === 'audio') {
          const pcmData = decodeHexAudio(data.content)
          if (pcmData && pcmData.length > 0 && audioContextRef.current) {
            const floatData = pcm16ToFloat32(pcmData)
            intensityRef.current = calculateIntensity(floatData)
            scheduleAudioPlayback(audioContextRef.current, floatData, nextPlayTimeRef)
          }
        } else if (data.type === 'session_resumption_update') {
          if (data.handle) {
            sessionHandleRef.current = data.handle
          }
        } else if (data.type === 'interrupted') {
          nextPlayTimeRef.current = 0
        } else if (data.type === 'tool_call') {
          setIsGenerating(true)
          toolCallPendingRef.current = true
        } else if (data.type === 'turn_complete') {
          turnBoundaryRef.current = true
          if (toolCallPendingRef.current) {
            toolCallPendingRef.current = false
            toolResponseTurnRef.current = true
          } else {
            toolResponseTurnRef.current = false
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
    } catch (error) {
      console.error('Brainstorm start error:', error)
      addMessage('Error: ' + (error as Error).message, 'system')
      stop()
      throw error
    } finally {
      setIsStarting(false)
    }
  }, [addMessage, selectedFlashModel, stop, upsertArtifact])

  const sendText = useCallback(
    (text: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'text', content: text }))
        addMessage(text, 'user')
      }
    },
    [addMessage],
  )

  const sendSnapshot = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          content: '[SYSTEM: User requested a brainstorm save. Call save_brainstorm_artifact now with all current ideas.]',
        }),
      )
    }
  }, [])

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
    start,
    stop,
    sendText,
    sendSnapshot,
  }
}
