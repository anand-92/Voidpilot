import { useState, useRef, useCallback } from 'react'

export type MessageRole = 'user' | 'gemini' | 'system' | 'thought'
export interface Message { role: MessageRole; content: string }

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [intensity, setIntensity] = useState(0)
  
  const socketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const nextPlayTimeRef = useRef<number>(0)

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
    socketRef.current?.close()
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    setIsConnected(false)
    setIntensity(0)
  }, [])

  const start = useCallback(async () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 16000 })
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 16000 }
      })

      const source = audioContextRef.current.createMediaStreamSource(stream)
      processorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1)

      socketRef.current = new WebSocket('ws://127.0.0.1:8000/api/v1/live/ws')

      socketRef.current.onopen = () => {
        setIsConnected(true)
        addMessage('Connected to Gemini Live', 'system')
      }

      socketRef.current.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data)
          if (data.type === 'thought') {
            addMessage(data.content, 'thought', true)
          } else if (data.type === 'text') {
            const isUser = data.content.startsWith('You (voice):')
            const role: MessageRole = isUser ? 'user' : 'gemini'
            addMessage(data.content.replace('You (voice): ', ''), role, true)
          }
        } else {
          const arrayBuffer = await event.data.arrayBuffer()
          if (arrayBuffer.byteLength > 0 && audioContextRef.current) {
            const pcmData = new Int16Array(arrayBuffer)
            const floatData = new Float32Array(pcmData.length)
            let maxVal = 0
            for (let i = 0; i < pcmData.length; i++) {
              floatData[i] = pcmData[i] / 0x8000
              if (Math.abs(floatData[i]) > maxVal) maxVal = Math.abs(floatData[i])
            }
            setIntensity(maxVal)

            const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, 24000)
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

      processorRef.current.onaudioprocess = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          let maxVal = 0
          for (let i = 0; i < inputData.length; i++) {
            if (Math.abs(inputData[i]) > maxVal) maxVal = Math.abs(inputData[i])
          }
          setIntensity(maxVal)

          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          socketRef.current.send(pcmData.buffer)
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

  const sendText = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'text', text }))
      addMessage(text, 'user')
    }
  }, [addMessage])

  return { isConnected, messages, intensity, start, stop, sendText }
}
