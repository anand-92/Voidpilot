import { useState, useRef, useCallback } from 'react'

export type MessageRole = 'user' | 'gemini' | 'system' | 'thought' | 'user_voice' | 'gemini_voice'
export interface Message { role: MessageRole; content: string }

const API_BASE_URL = 'ws://127.0.0.1:8001'
const SAMPLE_RATE = 24000
const AUDIO_BUFFER_SIZE = 512

// Audio processing helpers

function pcm16ToFloat32(pcmData: Int16Array): Float32Array {
  const floatData = new Float32Array(pcmData.length)
  for (let i = 0; i < pcmData.length; i++) {
    floatData[i] = pcmData[i] / 0x8000
  }
  return floatData
}

function float32ToPcm16(inputData: Float32Array): Int16Array {
  const pcmData = new Int16Array(inputData.length)
  for (let i = 0; i < inputData.length; i++) {
    const s = Math.max(-1, Math.min(1, inputData[i]))
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return pcmData
}

function calculateIntensityFromFloat(data: Float32Array): number {
  let maxVal = 0
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > maxVal) maxVal = Math.abs(data[i])
  }
  return maxVal
}

function resampleAudio(inputData: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) return inputData
  const ratio = sourceRate / targetRate
  const outputLength = Math.round(inputData.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    output[i] = inputData[Math.round(i * ratio)]
  }
  return output
}

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const intensityRef = useRef(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const nextPlayTimeRef = useRef<number>(0)

  const addMessage = useCallback((content: string, role: MessageRole) => {
    setMessages(prev => [...prev, { role, content }])
  }, [])

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    setIsConnected(false)
    intensityRef.current = 0
  }, [])

  const start = useCallback(async () => {
    try {
      // Connect to backend WebSocket
      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/live`)

      ws.onopen = () => {
        console.log('Connected to Gemini Live via backend')
        setIsConnected(true)
        addMessage('Connected to Gemini Live (backend)', 'system')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'text') {
          addMessage(data.content, 'gemini')
        }
        // Handle hex-encoded audio data from backend
        else if (data.type === 'audio') {
          // Backend sends hex-encoded PCM bytes - decode and play
          const bytes = new Uint8Array(data.content.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)))
          const pcmData = new Int16Array(bytes.buffer)

          if (pcmData.length > 0 && audioContextRef.current) {
            const floatData = pcm16ToFloat32(pcmData)
            intensityRef.current = calculateIntensityFromFloat(floatData)

            const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, SAMPLE_RATE)
            audioBuffer.getChannelData(0).set(floatData)
            const bufferSource = audioContextRef.current.createBufferSource()
            bufferSource.buffer = audioBuffer
            bufferSource.connect(audioContextRef.current.destination)

            const now = audioContextRef.current.currentTime
            if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now + 0.05
            bufferSource.start(nextPlayTimeRef.current)
            nextPlayTimeRef.current += audioBuffer.duration
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

      // Wait for WebSocket to be ready
      await new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.OPEN) {
          resolve()
        } else {
          ws.onopen = () => resolve()
        }
      })

      // Set up audio capture
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      })

      const source = audioContextRef.current.createMediaStreamSource(stream)
      processorRef.current = audioContextRef.current.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1)

      // Send audio to backend
      const sourceRate = audioContextRef.current.sampleRate
      const targetRate = 16000
      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          intensityRef.current = calculateIntensityFromFloat(inputData)

          // Resample to 16kHz
          const resampledData = resampleAudio(inputData, sourceRate, targetRate)
          const pcmData = float32ToPcm16(resampledData)

          // Send raw PCM bytes
          wsRef.current.send(pcmData.buffer)
        }
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      nextPlayTimeRef.current = 0
    } catch (err) {
      console.error(err)
      addMessage('Error: ' + (err as Error).message, 'system')
    }
  }, [addMessage])

  const sendText = useCallback(async (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', content: text }))
      addMessage(text, 'user')
    }
  }, [addMessage])

  return { isConnected, messages, intensityRef, start, stop, sendText }
}
