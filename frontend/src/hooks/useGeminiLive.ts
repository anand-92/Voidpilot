import { useCallback, useEffect, useRef, useState } from 'react'
import type { DesktopCapturerSource, RegionBounds } from '../electron-env'
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

export type CaptureConfig = {
  source: DesktopCapturerSource
  shareMode: 'full' | 'region'
  region?: RegionBounds
}

const MAX_FRAME_WIDTH = 1280
const MAX_FRAME_HEIGHT = 720

function getVideoCrop(
  videoWidth: number,
  videoHeight: number,
  source: DesktopCapturerSource,
  region?: RegionBounds,
): RegionBounds {
  if (!region) {
    return { x: 0, y: 0, width: videoWidth, height: videoHeight }
  }

  const displayWidth = Math.max(1, source.bounds.width)
  const displayHeight = Math.max(1, source.bounds.height)
  const scaleX = videoWidth / displayWidth
  const scaleY = videoHeight / displayHeight

  const x = Math.max(0, Math.min(videoWidth - 1, Math.round(region.x * scaleX)))
  const y = Math.max(0, Math.min(videoHeight - 1, Math.round(region.y * scaleY)))
  const width = Math.max(1, Math.min(videoWidth - x, Math.round(region.width * scaleX)))
  const height = Math.max(1, Math.min(videoHeight - y, Math.round(region.height * scaleY)))

  return { x, y, width, height }
}

function getOutputSize(width: number, height: number) {
  let scale = Math.min(MAX_FRAME_WIDTH / width, MAX_FRAME_HEIGHT / height)
  if (scale > 1) scale = 1
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export type PendingBashRequest = {
  callId: string
  command: string
  timeout: number
}

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingBash, setPendingBash] = useState<PendingBashRequest | null>(null)
  const intensityRef = useRef(0)
  const activeCaptureConfigRef = useRef<CaptureConfig | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const frameIntervalRef = useRef<number | null>(null)
  const nextPlayTimeRef = useRef(0)
  const lastImageDataRef = useRef<ImageData | null>(null)
  const pendingBashRef = useRef<PendingBashRequest | null>(null)

  // Keep ref in sync with state so ws.onmessage closures see latest value
  const syncPendingBash = useCallback((value: PendingBashRequest | null) => {
    pendingBashRef.current = value
    setPendingBash(value)
  }, [])

  function resolvePendingBash(ws: WebSocket) {
    const pending = pendingBashRef.current
    if (!pending) return

    syncPendingBash(null)

    if (window.electronAPI && window.electronAPI.runBash) {
      window.electronAPI
        .runBash({ command: pending.command, timeout: pending.timeout })
        .then((result) => {
          ws.send(JSON.stringify({ type: 'tool_response', call_id: pending.callId, result }))
        })
        .catch((error) => {
          ws.send(
            JSON.stringify({
              type: 'tool_response',
              call_id: pending.callId,
              result: 'Error: ' + error.message,
            }),
          )
        })
    } else {
      ws.send(
        JSON.stringify({
          type: 'tool_response',
          call_id: pending.callId,
          result: 'Error: Bash execution requires the Electron desktop app',
        }),
      )
    }
  }

  function denyPendingBash(ws: WebSocket) {
    const pending = pendingBashRef.current
    if (!pending) return

    syncPendingBash(null)
    ws.send(
      JSON.stringify({
        type: 'tool_response',
        call_id: pending.callId,
        result: 'User denied the command — it was not executed.',
      }),
    )
  }

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
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop())
      videoStreamRef.current = null
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null
      videoElementRef.current = null
    }
    if (frameIntervalRef.current !== null) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }

    lastImageDataRef.current = null
    activeCaptureConfigRef.current = null
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    setIsConnected(false)
    setIsStarting(false)
    intensityRef.current = 0
    nextPlayTimeRef.current = 0
  }, [])

  const start = useCallback(
    async (captureConfig?: CaptureConfig) => {
      setIsStarting(true)
      try {
        if (wsRef.current || streamRef.current) {
          stop()
        }

        activeCaptureConfigRef.current = captureConfig ?? null

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
          } else if (data.type === 'bash_confirm_voice') {
            // Gemini confirmed/denied via voice — resolve the pending bash request
            if (data.approved) {
              resolvePendingBash(ws)
            } else {
              denyPendingBash(ws)
            }
          } else if (data.type === 'tool_call') {
            console.log('Tool call received:', data.name, data.args)
            if (data.name === 'execute_midscene_action') {
              if (window.electronAPI && window.electronAPI.executeMidsceneAction) {
                window.electronAPI
                  .executeMidsceneAction(data.args)
                  .then((result) => {
                    ws.send(JSON.stringify({ type: 'tool_response', call_id: data.call_id, result }))
                  })
                  .catch((error) => {
                    console.error('Midscene action failed:', error)
                    ws.send(
                      JSON.stringify({
                        type: 'tool_response',
                        call_id: data.call_id,
                        result: 'Error: ' + error.message,
                      }),
                    )
                  })
              } else {
                ws.send(
                  JSON.stringify({
                    type: 'tool_response',
                    call_id: data.call_id,
                    result: 'Error: Electron API not available',
                  }),
                )
              }
            } else if (data.name === 'run_bash') {
              // Don't execute immediately — show confirmation popup
              syncPendingBash({
                callId: data.call_id,
                command: data.args.command,
                timeout: data.args.timeout ?? 30,
              })
            }
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
        let lastInterruptTime = 0
        processorRef.current.onaudioprocess = (event) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0)
            intensityRef.current = calculateIntensity(inputData)

            if (intensityRef.current > 0.4) {
              const now = Date.now()
              if (now - lastInterruptTime > 1500) {
                lastInterruptTime = now
                if (window.electronAPI && window.electronAPI.interruptMidscene) {
                  window.electronAPI.interruptMidscene().catch(() => {})
                }
              }
            }

            const resampledData = resampleAudio(inputData, sourceRate, MIC_TARGET_RATE)
            const pcmData = float32ToPcm16(resampledData)
            wsRef.current.send(pcmData.buffer)
          }
        }

        source.connect(processorRef.current)
        processorRef.current.connect(audioContextRef.current.destination)
        nextPlayTimeRef.current = 0

        if (captureConfig) {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: captureConfig.source.id,
              },
            } as unknown as MediaTrackConstraints,
          })

          videoStreamRef.current = videoStream

          const videoElement = document.createElement('video')
          videoElement.srcObject = videoStream
          await videoElement.play()
          videoElementRef.current = videoElement

          const canvas = document.createElement('canvas')

          frameIntervalRef.current = window.setInterval(() => {
            if (!activeCaptureConfigRef.current) {
              return
            }
            if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
              return
            }

            const crop = getVideoCrop(
              videoElement.videoWidth,
              videoElement.videoHeight,
              activeCaptureConfigRef.current.source,
              activeCaptureConfigRef.current.shareMode === 'region'
                ? activeCaptureConfigRef.current.region
                : undefined,
            )
            const outputSize = getOutputSize(crop.width, crop.height)

            canvas.width = outputSize.width
            canvas.height = outputSize.height
            const context = canvas.getContext('2d')
            if (!context) {
              return
            }

            context.drawImage(
              videoElement,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              0,
              0,
              outputSize.width,
              outputSize.height,
            )

            const currentImageData = context.getImageData(0, 0, outputSize.width, outputSize.height)
            let significantChange = true

            if (
              lastImageDataRef.current &&
              lastImageDataRef.current.width === outputSize.width &&
              lastImageDataRef.current.height === outputSize.height
            ) {
              const previousData = lastImageDataRef.current.data
              const currentData = currentImageData.data
              let diffCount = 0
              const totalPixels = outputSize.width * outputSize.height
              const threshold = 30
              const checkedPixels = Math.floor(totalPixels / 4)
              const skipThreshold = checkedPixels * 0.05

              for (let i = 0; i < currentData.length; i += 16) {
                const redDiff = Math.abs(currentData[i] - previousData[i])
                const greenDiff = Math.abs(currentData[i + 1] - previousData[i + 1])
                const blueDiff = Math.abs(currentData[i + 2] - previousData[i + 2])
                if (redDiff > threshold || greenDiff > threshold || blueDiff > threshold) {
                  diffCount += 1
                }
              }

              if (diffCount < skipThreshold) {
                significantChange = false
              }
            }

            if (!significantChange) {
              console.log('Frame skipped due to low delta')
              return
            }

            lastImageDataRef.current = currentImageData
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const base64Data = dataUrl.split(',')[1]
              wsRef.current.send(JSON.stringify({ type: 'image', content: base64Data, mime_type: 'image/jpeg' }))
            }
          }, 1000)
        }
      } catch (error) {
        console.error(error)
        addMessage('Error: ' + (error as Error).message, 'system')
        stop()
        throw error
      } finally {
        setIsStarting(false)
      }
    },
    [addMessage, stop],
  )

  const sendText = useCallback(
    async (text: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'text', content: text }))
        addMessage(text, 'user')
      }
    },
    [addMessage],
  )

  const confirmBash = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      resolvePendingBash(wsRef.current)
    }
  }, [])

  const denyBash = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      denyPendingBash(wsRef.current)
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
    intensityRef,
    pendingBash,
    start,
    stop,
    sendText,
    confirmBash,
    denyBash,
  }
}
