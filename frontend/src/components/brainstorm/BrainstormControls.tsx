import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { PulsatingButton } from '@/components/ui/pulsating-button'
import {
  BRAINSTORM_FLASH_MODEL_OPTIONS,
  type BrainstormFlashModel,
} from '../../hooks/useGeminiBrainstorm'
import {
  GeminiMicOff,
  GeminiMicOn,
  GeminiSend,
} from '../icons/GeminiIcons'
import { cn } from '@/lib/utils'

type BrainstormControlsProps = {
  isConnected: boolean
  isStarting: boolean
  selectedFlashModel: BrainstormFlashModel
  setSelectedFlashModel: Dispatch<SetStateAction<BrainstormFlashModel>>
  inputText: string
  setInputText: (value: string) => void
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  layout: 'desktop' | 'mobile'
}

export function BrainstormControls({
  isConnected,
  isStarting,
  selectedFlashModel,
  setSelectedFlashModel,
  inputText,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  layout,
}: BrainstormControlsProps) {
  const isMobile = layout === 'mobile'

  const handleModelToggle = () => {
    const currentIndex = BRAINSTORM_FLASH_MODEL_OPTIONS.findIndex(opt => opt.value === selectedFlashModel)
    const nextIndex = (currentIndex + 1) % BRAINSTORM_FLASH_MODEL_OPTIONS.length
    setSelectedFlashModel(BRAINSTORM_FLASH_MODEL_OPTIONS[nextIndex].value)
  }

  const selectedModelLabel = BRAINSTORM_FLASH_MODEL_OPTIONS.find(opt => opt.value === selectedFlashModel)?.label ?? 'LITE'

  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02]">
            {selectedFlashModel === 'gemini-3.1-pro' && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl animate-pulse" />
            )}
            {selectedFlashModel === 'gemini-3-flash' && (
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 blur-xl animate-pulse" />
            )}
            <button
              onClick={handleModelToggle}
              disabled={isConnected || isStarting}
              aria-label="Toggle flash worker model"
              className={cn(
                "min-h-12 w-[80px] flex items-center justify-center cursor-pointer px-2 text-xs font-bold tracking-wider outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 relative z-10",
                selectedFlashModel === 'gemini-3.1-pro' ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "",
                selectedFlashModel === 'gemini-3-flash' ? "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" : "",
                selectedFlashModel === 'gemini-3.1-flash-lite' ? "text-stone-400 font-medium hover:bg-white/[0.04]" : ""
              )}
            >
              {selectedModelLabel}
            </button>
          </div>

          {!isConnected ? (
            <ShimmerButton
              onClick={handleConnect}
              disabled={isStarting}
              shimmerColor="#fbbf24"
              shimmerDuration="2.5s"
              background="linear-gradient(135deg, #d97706, #b45309)"
              borderRadius="16px"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-bold whitespace-nowrap text-stone-950 shadow-[0_8px_32px_rgba(217,119,6,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GeminiMicOn className="size-4 shrink-0" />
              {isStarting ? 'Connecting…' : 'Start'}
            </ShimmerButton>
          ) : (
            <PulsatingButton
              onClick={stop}
              pulseColor="rgba(220, 38, 38, 0.3)"
              duration="2s"
              className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold whitespace-nowrap text-white shadow-[0_8px_32px_rgba(220,38,38,0.25)] hover:bg-red-500"
            >
              End Session
            </PulsatingButton>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-white/[0.05] bg-stone-950/70 p-2">
          <div className="flex gap-2">
            <Input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSend()}
              placeholder={isConnected ? 'Type a message…' : 'Connect first to chat'}
              disabled={!isConnected}
              aria-label="Message input"
              className="min-h-11 flex-1 rounded-2xl border-white/[0.06] bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-stone-600 focus:border-amber-500/30 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            />
            <Button
              onClick={handleSend}
              disabled={!isConnected || !inputText.trim()}
              aria-label="Send message"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-amber-600/80 text-stone-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <GeminiSend className="size-4" />
            </Button>
          </div>
        </div>
      </>
    )
  }

  // Floating Control Center for Desktop Redesign
  return (
    <div className="flex flex-col gap-3 rounded-[2rem] border border-white/[0.08] bg-black/60 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl">
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <ShimmerButton
            onClick={handleConnect}
            disabled={isStarting}
            shimmerColor="#fbbf24"
            shimmerDuration="2.5s"
            background="linear-gradient(135deg, #d97706, #b45309)"
            borderRadius="16px"
            className="flex flex-1 items-center justify-center gap-2 text-sm font-bold text-stone-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <GeminiMicOn className="size-4" />
            {isStarting ? 'Connecting…' : 'Connect'}
          </ShimmerButton>
        ) : (
          <PulsatingButton
            onClick={stop}
            pulseColor="rgba(220, 38, 38, 0.4)"
            duration="2s"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500/90 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md hover:bg-red-500"
          >
            <GeminiMicOff className="size-4" />
            End Session
          </PulsatingButton>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5 backdrop-blur-md relative overflow-hidden">
        {selectedFlashModel === 'gemini-3.1-pro' && (
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
        )}
        {selectedFlashModel === 'gemini-3-flash' && (
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-xl animate-pulse" />
        )}
        <button
          onClick={handleModelToggle}
          disabled={isConnected || isStarting}
          aria-label="Toggle flash worker model"
          className={cn(
            "h-10 w-[72px] flex items-center justify-center cursor-pointer rounded-xl bg-transparent px-2 text-xs font-bold tracking-wider outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 relative z-10",
            selectedFlashModel === 'gemini-3.1-pro' ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "",
            selectedFlashModel === 'gemini-3-flash' ? "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" : "",
            selectedFlashModel === 'gemini-3.1-flash-lite' ? "text-stone-400 font-medium hover:text-stone-300 hover:bg-white/[0.04]" : ""
          )}
        >
          {selectedModelLabel}
        </button>
        <div className="h-6 w-px bg-white/10 relative z-10" />
        <Input
          type="text"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSend()}
          placeholder={isConnected ? 'Message Gemini...' : 'Connect to brainstorm...'}
          disabled={!isConnected}
          className="flex-1 h-10 border-0 bg-transparent px-3 text-sm text-white shadow-none focus-visible:ring-0 placeholder:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={!isConnected || !inputText.trim()}
          size="icon"
          className="size-10 shrink-0 cursor-pointer rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-stone-950 shadow-md transition-transform hover:scale-105 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <GeminiSend className="size-4 translate-x-[-1px] translate-y-[1px]" />
        </Button>
      </div>
    </div>
  )
}
