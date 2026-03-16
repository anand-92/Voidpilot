import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { PulsatingButton } from '@/components/ui/pulsating-button'
import type { BrainstormVoice } from '@/hooks/useGeminiBrainstorm'
import { SparkToolbar } from './SparkToolbar'
import {
  GeminiMicOff,
  GeminiMicOn,
  GeminiSend,
} from '../icons/GeminiIcons'
import { VoiceSelector } from './VoiceSelector'

type CreativeSparkControlsProps = {
  isConnected: boolean
  isStarting: boolean
  isToolRunning: boolean
  selectedVoice: BrainstormVoice
  setSelectedVoice: Dispatch<SetStateAction<BrainstormVoice>>
  inputText: string
  setInputText: (value: string) => void
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  layout: 'desktop' | 'mobile'
  onResetLayout?: () => void
  onCreateShare?: () => Promise<string | null>
  onGoBack?: () => void
}

/**
 * Minimalist floating controls for Creative Spark mode.
 *
 * Single-row pill: connection button + text input + send.
 * No tool toggles or model selector — those are Open Studio only.
 */
export function CreativeSparkControls({
  isConnected,
  isStarting,
  isToolRunning,
  selectedVoice,
  setSelectedVoice,
  inputText,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  layout,
  onResetLayout,
  onCreateShare,
  onGoBack,
}: CreativeSparkControlsProps) {
  const isDisabled = isConnected || isStarting

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/60 p-1.5 shadow-2xl backdrop-blur-2xl">
      {/* Voice selector */}
      <VoiceSelector
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        disabled={isDisabled}
        compact
      />

      {/* Connection / disconnect button */}
      {!isConnected ? (
        <ShimmerButton
          onClick={handleConnect}
          disabled={isStarting}
          shimmerColor="#60a5fa"
          shimmerDuration="2.5s"
          background="linear-gradient(135deg, #3b82f6, #1e40af)"
          borderRadius="9999px"
          className="flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-stone-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GeminiMicOn className="size-4" />
          {isStarting ? 'Connecting…' : 'Start Sparking'}
        </ShimmerButton>
      ) : (
        <PulsatingButton
          onClick={stop}
          pulseColor="rgba(220, 38, 38, 0.3)"
          duration="2s"
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GeminiMicOff className="size-4" />
          End
        </PulsatingButton>
      )}

      {/* Text input */}
      <Input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !isToolRunning && handleSend()}
        placeholder={isConnected ? (isToolRunning ? 'Wait for the tool to finish…' : 'Type a message…') : 'Connect to start…'}
        disabled={!isConnected || isToolRunning}
        aria-label="Message input"
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white shadow-none focus-visible:ring-0 placeholder:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50 h-9 px-3"
      />
      <Button
        onClick={handleSend}
        disabled={!isConnected || isToolRunning || !inputText.trim()}
        aria-label="Send message"
        className="shrink-0 cursor-pointer rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-stone-950 shadow-md transition-transform size-9 hover:scale-105 hover:from-orange-400 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        <GeminiSend className="size-4" />
      </Button>

      {layout === 'desktop' && onResetLayout ? (
        <SparkToolbar onGoBack={onGoBack} onResetLayout={onResetLayout} onCreateShare={onCreateShare} />
      ) : null}
    </div>
  )
}
