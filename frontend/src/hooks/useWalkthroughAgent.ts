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
  smoothIntensity,
} from '../utils/audio.ts'

export function useWalkthroughAgent() {
  const [isConnected, setIsConnected] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const inputIntensityRef = useRef(0)
  const outputIntensityRef = useRef(0)
  const visualIntensityRef = useRef(0)
  const playbackSegmentsRef = useRef<Array<{ startTime: number; endTime: number; intensity: number }>>([])

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)

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
              segment.endTime > audioContext.currentTime - 0.05 &&
              segment.startTime < audioContext.currentTime + 0.16

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
    inputIntensityRef.current = 0
    outputIntensityRef.current = 0
    visualIntensityRef.current = 0
    nextPlayTimeRef.current = 0
    playbackSegmentsRef.current = []
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
        const outputLevel = Math.max(calculateIntensity(floatData), 0.08)
        outputIntensityRef.current = smoothIntensity(outputIntensityRef.current, outputLevel, {
          attack: 0.82,
          release: 0.16,
        })
        const { startTime, endTime } = scheduleAudioPlayback(
          audioContextRef.current,
          floatData,
          nextPlayTimeRef,
        )
        playbackSegmentsRef.current.push({ startTime, endTime, intensity: outputLevel })
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
    inputIntensityRef,
    outputIntensityRef,
    visualIntensityRef,
  }
}
