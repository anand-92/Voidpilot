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

      const ws = new WebSocket(`${API_BASE_URL}/api/v1/live/walkthrough`)

      ws.onopen = () => {
        console.log('Connected to walkthrough agent')
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type !== 'audio') return

        const pcmData = decodeHexAudio(data.content)
        if (!pcmData || pcmData.length === 0 || !audioContextRef.current) return

        const floatData = pcm16ToFloat32(pcmData)
        intensityRef.current = calculateIntensity(floatData)
        scheduleAudioPlayback(audioContextRef.current, floatData, nextPlayTimeRef)
      }

      ws.onerror = (error) => {
        console.error('Walkthrough WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('Walkthrough WebSocket closed')
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
      console.error('Walkthrough start error:', error)
      stop()
      throw error
    } finally {
      setIsStarting(false)
    }
  }, [stop])

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
