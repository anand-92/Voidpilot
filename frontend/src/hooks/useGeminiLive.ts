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

export type MessageRole = 'user' | 'gemini' | 'system' | 'thought' | 'user_voice' | 'gemini_voice'
export interface Message {
  role: MessageRole
  content: string
  isToolResponse?: boolean
}

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const intensityRef = useRef(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)

  const addMessage = useCallback((content: string, role: MessageRole) => {
    setMessages((previous) => {
      const lastMessage = previous[previous.length - 1]
      if (lastMessage && lastMessage.role === role) {
        const updated = [...previous]
        updated[updated.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + content,
        }
        return updated
      }
      return [...previous, { role, content }]
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
    intensityRef.current = 0
    nextPlayTimeRef.current = 0
  }, [])

  const start = useCallback(async () => {
    setIsStarting(true)
    try {
      if (wsRef.current || streamRef.current) {
        stop()
      }

      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/live`)

      ws.onopen = () => {
        console.log('Connected to Gemini Live via backend')
        setIsConnected(true)
        addMessage('Connected to Gemini Live (backend)', 'system')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'text') {
          const role = data.role === 'user' ? 'user' : 'gemini'
          addMessage(data.content, role)
        } else if (data.type === 'tool_call') {
          console.log('Tool call received:', data.name, data.args)
        } else if (data.type === 'audio') {
          const pcmData = decodeHexAudio(data.content)
          if (pcmData && pcmData.length > 0 && audioContextRef.current) {
            const floatData = pcm16ToFloat32(pcmData)
            intensityRef.current = calculateIntensity(floatData)
            scheduleAudioPlayback(audioContextRef.current, floatData, nextPlayTimeRef)
          }
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        addMessage('Connection error', 'system')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.reason)
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
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          intensityRef.current = calculateIntensity(inputData)

          const resampledData = resampleAudio(inputData, sourceRate, MIC_TARGET_RATE)
          const pcmData = float32ToPcm16(resampledData)
          wsRef.current.send(pcmData.buffer)
        }
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      nextPlayTimeRef.current = 0
    } catch (error) {
      console.error(error)
      addMessage('Error: ' + (error as Error).message, 'system')
      stop()
      throw error
    } finally {
      setIsStarting(false)
    }
  }, [addMessage, stop])

  const sendText = useCallback(
    async (text: string) => {
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
    intensityRef,
    start,
    stop,
    sendText,
  }
}
