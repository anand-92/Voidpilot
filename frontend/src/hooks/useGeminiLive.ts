import { useState, useRef, useCallback } from 'react'
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai'

export type MessageRole = 'user' | 'gemini' | 'system' | 'thought'
export interface Message { role: MessageRole; content: string }

const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'
const API_BASE_URL = 'http://127.0.0.1:8001'
const SAMPLE_RATE = 24000
const AUDIO_BUFFER_SIZE = 512

// Audio processing helpers (module-level for reuse)

function decodeBase64Audio(base64Data: string): Uint8Array {
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

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

// Resample audio from source rate to target rate (simple decimation/interpolation)
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
  const [intensity, setIntensity] = useState(0)

  const aiRef = useRef<GoogleGenAI | null>(null)
  const sessionRef = useRef<Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const isStreamingRef = useRef<boolean>(false)

  const addMessage = useCallback((content: string, role: MessageRole, isStreaming = false) => {
    setMessages(prev => {
      if (prev.length > 0 && isStreaming) {
        const last = prev[prev.length - 1]
        if (last.role === role) {
          if (last.content.endsWith(content)) return prev
          const updated = [...prev]
          updated[updated.length - 1] = { ...last, content: last.content + content }
          return updated
        }
      }
      return [...prev, { role, content }]
    })
  }, [])

  const stop = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close()
      sessionRef.current = null
    }
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    setIsConnected(false)
    setIntensity(0)
    isStreamingRef.current = false
  }, [])

  const start = useCallback(async () => {
    try {
      // Step 1: Get ephemeral token from backend
      const tokenResponse = await fetch(`${API_BASE_URL}/api/v1/live/token`, {
        method: 'POST'
      })
      if (!tokenResponse.ok) {
        throw new Error(`Failed to get token: ${tokenResponse.statusText}`)
      }
      const { token } = await tokenResponse.json()

      // Step 2: Set up audio capture
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      })

      const source = audioContextRef.current.createMediaStreamSource(stream)
      processorRef.current = audioContextRef.current.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1)

      // Step 3: Connect to Gemini Live API directly
      // Ephemeral tokens only work with v1alpha API version
      aiRef.current = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' }
      })

      const session = await aiRef.current.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onMessage(message: LiveServerMessage) {
            // Handle text responses
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                  addMessage(part.text, 'gemini', true)
                }
              }
            }

            // Handle audio responses
            if (message.serverContent?.media?.data) {
              const bytes = decodeBase64Audio(message.serverContent.media.data)
              const pcmData = new Int16Array(bytes.buffer)

              if (pcmData.length > 0 && audioContextRef.current) {
                const floatData = pcm16ToFloat32(pcmData)
                setIntensity(calculateIntensityFromFloat(floatData))

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

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              isStreamingRef.current = false
            }
          },
          onError(error: ErrorEvent) {
            console.error('Gemini Live error:', error)
            addMessage(`Error: ${error}`, 'system')
          }
        }
      })

      sessionRef.current = session
      setIsConnected(true)
      addMessage('Connected to Gemini Live (direct)', 'system')

      // Step 4: Send audio from microphone to Gemini
      // Resample from AudioContext rate (typically 48kHz) to 16kHz as required by API
      const sourceRate = audioContextRef.current.sampleRate
      const targetRate = 16000
      processorRef.current.onaudioprocess = (e) => {
        if (sessionRef.current && !sessionRef.current.closed) {
          const inputData = e.inputBuffer.getChannelData(0)
          setIntensity(calculateIntensityFromFloat(inputData))

          // Resample to 16kHz
          const resampledData = resampleAudio(inputData, sourceRate, targetRate)
          const pcmData = float32ToPcm16(resampledData)
          // Convert Int16Array to base64 using Uint8Array view (proper binary conversion)
          const uint8Array = new Uint8Array(pcmData.buffer)
          let binary = ''
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i])
          }
          const base64Audio = btoa(binary)
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: 'audio/pcm;rate=16000'
            }
          })
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
    if (sessionRef.current && !sessionRef.current.closed) {
      sessionRef.current.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }] })
      addMessage(text, 'user')
    }
  }, [addMessage])

  return { isConnected, messages, intensity, start, stop, sendText }
}
