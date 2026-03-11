/**
 * Shared audio utilities for PCM16 encoding/decoding, resampling,
 * and WebSocket/AudioContext configuration constants.
 */

export const SAMPLE_RATE = 24000
export const AUDIO_BUFFER_SIZE = 512
export const MIC_TARGET_RATE = 16000

const isElectron = window.electronAPI !== undefined
const wsProtocol = isElectron ? 'wss:' : window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const wsHost = isElectron ? 'voidpilot-bcz5ilsa6q-ue.a.run.app' : window.location.host
export const API_BASE_URL = `${wsProtocol}//${wsHost}`

export function pcm16ToFloat32(pcmData: Int16Array): Float32Array {
  const floatData = new Float32Array(pcmData.length)
  for (let i = 0; i < pcmData.length; i += 1) {
    floatData[i] = pcmData[i] / 0x8000
  }
  return floatData
}

export function float32ToPcm16(inputData: Float32Array): Int16Array {
  const pcmData = new Int16Array(inputData.length)
  for (let i = 0; i < inputData.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, inputData[i]))
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return pcmData
}

export function calculateIntensity(data: Float32Array): number {
  if (data.length === 0) return 0

  let maxValue = 0
  let sumSquares = 0
  for (let i = 0; i < data.length; i += 1) {
    const sample = Math.abs(data[i])
    if (sample > maxValue) maxValue = sample
    sumSquares += sample * sample
  }

  const rms = Math.sqrt(sumSquares / data.length)
  const weightedLevel = maxValue * 0.55 + rms * 2.4
  return Math.min(1, weightedLevel)
}

export function smoothIntensity(
  current: number,
  next: number,
  options?: { attack?: number; release?: number },
): number {
  const attack = options?.attack ?? 0.7
  const release = options?.release ?? 0.18
  const factor = next >= current ? attack : release
  return current + (next - current) * factor
}

export function resampleAudio(inputData: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) return inputData
  const ratio = sourceRate / targetRate
  const outputLength = Math.round(inputData.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i += 1) {
    output[i] = inputData[Math.round(i * ratio)]
  }
  return output
}

export function createAudioContext(): AudioContext {
  return new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )()
}

export async function requestMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    })
  } catch {
    return await navigator.mediaDevices.getUserMedia({ audio: true })
  }
}

export function decodeHexAudio(hexString: string): Int16Array | null {
  const hexMatch = hexString.match(/.{1,2}/g)
  if (!hexMatch) return null
  const bytes = new Uint8Array(hexMatch.map((byte: string) => parseInt(byte, 16)))
  return new Int16Array(bytes.buffer)
}

export function scheduleAudioPlayback(
  audioContext: AudioContext,
  floatData: Float32Array,
  nextPlayTimeRef: { current: number },
): { startTime: number; endTime: number } {
  const audioBuffer = audioContext.createBuffer(1, floatData.length, SAMPLE_RATE)
  audioBuffer.getChannelData(0).set(floatData)
  const bufferSource = audioContext.createBufferSource()
  bufferSource.buffer = audioBuffer
  bufferSource.connect(audioContext.destination)

  const now = audioContext.currentTime
  if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now + 0.05
  const startTime = nextPlayTimeRef.current
  const endTime = startTime + audioBuffer.duration
  bufferSource.start(startTime)
  nextPlayTimeRef.current = endTime

  return { startTime, endTime }
}
