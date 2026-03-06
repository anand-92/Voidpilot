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
  const videoStreamRef = useRef<MediaStream | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const frameIntervalRef = useRef<number | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const lastImageDataRef = useRef<ImageData | null>(null)

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
    // Stop audio stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    // Stop video stream tracks
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop())
      videoStreamRef.current = null
    }
    // Clear video element
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
      videoElementRef.current = null;
    }
    // Clear interval
    if (frameIntervalRef.current !== null) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    // Clear last frame data
    lastImageDataRef.current = null;
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
          if (data.name === 'execute_midscene_action') {
            if (window.electronAPI && window.electronAPI.executeMidsceneAction) {
              window.electronAPI.executeMidsceneAction(data.args)
                .then(result => {
                  ws.send(JSON.stringify({ type: 'tool_response', call_id: data.call_id, result }))
                })
                .catch(err => {
                  console.error('Midscene action failed:', err)
                  ws.send(JSON.stringify({ type: 'tool_response', call_id: data.call_id, result: 'Error: ' + err.message }))
                })
            } else {
              ws.send(JSON.stringify({ type: 'tool_response', call_id: data.call_id, result: 'Error: Electron API not available' }))
            }
          }
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
      let lastInterruptTime = 0
      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          intensityRef.current = calculateIntensityFromFloat(inputData)

          if (intensityRef.current > 0.1) {
            const now = Date.now();
            if (now - lastInterruptTime > 1000) {
              lastInterruptTime = now;
              if (window.electronAPI && window.electronAPI.interruptMidscene) {
                 window.electronAPI.interruptMidscene().catch(() => {});
              }
            }
          }

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

      // Set up video capture (desktop)
      try {
        if (window.electronAPI && window.electronAPI.getDesktopSources) {
          const sources = await window.electronAPI.getDesktopSources()
          const primarySource = sources.find((s: { id: string }) => s.id.startsWith('screen')) || sources[0]
          if (primarySource) {
            console.log('Stream acquired:', primarySource.id)
            const videoStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: primarySource.id,
                }
              } as unknown as MediaTrackConstraints
            })

            videoStreamRef.current = videoStream

            const videoElement = document.createElement('video')
            videoElement.srcObject = videoStream
            await videoElement.play()
            videoElementRef.current = videoElement

            const canvas = document.createElement('canvas')
            
            frameIntervalRef.current = window.setInterval(() => {
              if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                const width = videoElement.videoWidth
                const height = videoElement.videoHeight
                
                // Downscale to max 1280x720
                const MAX_WIDTH = 1280
                const MAX_HEIGHT = 720
                let scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
                if (scale > 1) scale = 1
                
                const dw = Math.round(width * scale)
                const dh = Math.round(height * scale)

                canvas.width = dw
                canvas.height = dh
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(videoElement, 0, 0, dw, dh)
                  
                  // Delta-Vision logic
                  const currentImageData = ctx.getImageData(0, 0, dw, dh)
                  let significantChange = true

                  if (lastImageDataRef.current && lastImageDataRef.current.width === dw && lastImageDataRef.current.height === dh) {
                    const prevData = lastImageDataRef.current.data
                    const currData = currentImageData.data
                    let diffCount = 0
                    const totalPixels = dw * dh
                    const threshold = 30 // Pixel difference threshold (0-255)
                    // Check every 4th pixel to save CPU (i += 16 because of RGBA)
                    const totalPixelsChecked = Math.floor(totalPixels / 4)
                    const skipThreshold = totalPixelsChecked * 0.01 // 1% of checked pixels must change

                    for (let i = 0; i < currData.length; i += 16) {
                      const rDiff = Math.abs(currData[i] - prevData[i])
                      const gDiff = Math.abs(currData[i+1] - prevData[i+1])
                      const bDiff = Math.abs(currData[i+2] - prevData[i+2])
                      
                      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
                        diffCount++
                      }
                    }

                    if (diffCount < skipThreshold) {
                      significantChange = false
                    }
                  }

                  if (!significantChange) {
                    console.log('Frame skipped due to low delta')
                  } else {
                    lastImageDataRef.current = currentImageData
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
                    
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      console.log('Frame extracted and sent at 1 fps')
                      const base64Data = dataUrl.split(',')[1]
                      wsRef.current.send(JSON.stringify({ type: 'image', content: base64Data, mime_type: 'image/jpeg' }))
                    }
                  }
                }
              }
            }, 1000)
          }
        }
      } catch (err) {
        console.error('Failed to get desktop stream:', err)
      }
    } catch (err) {
      console.error(err)
      addMessage('Error: ' + (err as Error).message, 'system')
    }
  }, [addMessage, stop])

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
