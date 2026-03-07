import { useCallback, useEffect, useRef, useState } from 'react'

const isElectron = window.electronAPI !== undefined
const wsProtocol = isElectron ? 'wss:' : window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const wsHost = isElectron ? 'voidpilot-bcz5ilsa6q-ue.a.run.app' : window.location.host
const API_BASE_URL = `${wsProtocol}//${wsHost}`
const SAMPLE_RATE = 24000
const AUDIO_BUFFER_SIZE = 512

function pcm16ToFloat32(pcmData: Int16Array): Float32Array {
  const floatData = new Float32Array(pcmData.length)
  for (let i = 0; i < pcmData.length; i += 1) {
    floatData[i] = pcmData[i] / 0x8000
  }
  return floatData
}

function float32ToPcm16(inputData: Float32Array): Int16Array {
  const pcmData = new Int16Array(inputData.length)
  for (let i = 0; i < inputData.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, inputData[i]))
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return pcmData
}

function calculateIntensityFromFloat(data: Float32Array): number {
  let maxValue = 0
  for (let i = 0; i < data.length; i += 1) {
    if (Math.abs(data[i]) > maxValue) maxValue = Math.abs(data[i])
  }
  return maxValue
}

function resampleAudio(inputData: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) return inputData
  const ratio = sourceRate / targetRate
  const outputLength = Math.round(inputData.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i += 1) {
    output[i] = inputData[Math.round(i * ratio)]
  }
  return output
}

export function useWalkthroughAgent() {
  const [isConnected, setIsConnected] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const intensityRef = useRef(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)

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

      // Connect to walkthrough endpoint
      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/walkthrough`)

      ws.onopen = () => {
        console.log('Connected to walkthrough agent')
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'audio') {
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
        // Ignore other message types (text, tool_call, etc.)
      }

      ws.onerror = (error) => {
        console.error('Walkthrough WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('Walkthrough WebSocket closed')
        setIsConnected(false)
      }

      wsRef.current = ws

      // Wait for connection
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

      // Create AudioContext
      audioContextRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()

      // Get microphone
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
      } catch {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      // Set up audio processing
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
      processorRef.current = audioContextRef.current.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1)

      const sourceRate = audioContextRef.current.sampleRate
      const targetRate = 16000
      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          intensityRef.current = calculateIntensityFromFloat(inputData)

          const resampledData = resampleAudio(inputData, sourceRate, targetRate)
          const pcmData = float32ToPcm16(resampledData)
          wsRef.current.send(pcmData.buffer)
        }
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      nextPlayTimeRef.current = 0
    } catch (error) {
      console.error('Walkthrough start error:', error)
      stop()
      throw error
    } finally {
      setIsStarting(false)
    }
  }, [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    isConnected,
    isStarting,
    start,
    stop,
    intensityRef,
  }
}
