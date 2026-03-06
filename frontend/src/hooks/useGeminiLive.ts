import { useState, useRef, useCallback, useEffect } from 'react'

export type MessageRole = 'user' | 'gemini' | 'system' | 'thought' | 'user_voice' | 'gemini_voice'
export interface Message { role: MessageRole; content: string }

// Use current host with WebSocket protocol (ws:// or wss:// based on HTTP/HTTPS)
const isElectronPackaged = window.location.protocol === 'file:'
const wsProtocol = isElectronPackaged ? 'ws:' : (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const wsHost = isElectronPackaged ? '127.0.0.1:8000' : window.location.host
const API_BASE_URL = `${wsProtocol}//${wsHost}`
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
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef<number>(0)

  const addMessage = useCallback((content: string, role: MessageRole) => {
    setMessages(prev => {
      // If the last message has the same role, append to it (for streaming text)
      const lastMsg = prev[prev.length - 1]
      if (lastMsg && lastMsg.role === role) {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + content
        }
        return updated
      }
      return [...prev, { role, content }]
    })
  }, [])



  const stop = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    // Stop all media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    // Disconnect and close audio nodes
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    // Reset state
    setIsConnected(false)
    intensityRef.current = 0
    nextPlayTimeRef.current = 0
  }, [])

  const start = useCallback(async () => {
    try {
      // Cleanup existing connection if any
      if (wsRef.current || streamRef.current) {
        stop()
      }
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
          // Use role from message if present, otherwise default to gemini
          const role = data.role === 'user' ? 'user' : 'gemini'
          addMessage(data.content, role)
        }
        // Handle tool call responses
        else if (data.type === 'tool_call') {
          console.log('Tool call received:', data.name, data.args)
        }
        // Handle hex-encoded audio data from backend
        else if (data.type === 'audio') {
          // Backend sends hex-encoded PCM bytes - decode and play
          const hexMatch = data.content.match(/.{1,2}/g)
          if (!hexMatch) return
          const bytes = new Uint8Array(hexMatch.map((byte: string) => parseInt(byte, 16)))
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
          const originalOnOpen = ws.onopen
          ws.onopen = (event) => {
            if (originalOnOpen) originalOnOpen.call(ws, event)
            resolve()
          }
        }
      })

      // Set up audio capture
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      })

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop() }
  }, [stop])

  return { isConnected, messages, intensityRef, start, stop, sendText }
}
