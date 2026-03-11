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
  GeminiStar,
} from '../icons/GeminiIcons'

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

  if (isMobile) {
    return (
      <>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <label className="order-2 flex min-h-12 flex-col justify-center rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs font-medium text-stone-300 lg:order-1">
            <span className="mb-1 text-[10px] uppercase tracking-[0.2em] text-stone-600">Flash worker model</span>
            <select
              value={selectedFlashModel}
              onChange={(event) => setSelectedFlashModel(event.target.value as BrainstormFlashModel)}
              disabled={isConnected || isStarting}
              aria-label="Flash worker model"
              className="min-h-11 cursor-pointer rounded-xl border border-white/[0.06] bg-stone-950 px-3 text-sm text-white outline-none transition-colors focus:border-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {BRAINSTORM_FLASH_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="order-1 flex flex-col gap-3 sm:flex-row lg:order-2">
            {!isConnected ? (
              <ShimmerButton
                onClick={handleConnect}
                disabled={isStarting}
                shimmerColor="#fbbf24"
                shimmerDuration="2.5s"
                background="linear-gradient(135deg, #d97706, #b45309)"
                borderRadius="16px"
                className="flex min-h-12 flex-1 items-center justify-center gap-2.5 px-5 py-3 text-sm font-bold text-stone-950 shadow-[0_8px_32px_rgba(217,119,6,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <GeminiMicOn className="size-4" />
                {isStarting ? 'Connecting…' : 'Start Brainstorm'}
              </ShimmerButton>
            ) : (
              <PulsatingButton
                onClick={stop}
                pulseColor="rgba(220, 38, 38, 0.3)"
                duration="2s"
                className="flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(220,38,38,0.25)] hover:bg-red-500"
              >
                <GeminiMicOff className="size-4" />
                End Session
              </PulsatingButton>
            )}
          </div>
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

      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5 backdrop-blur-md">
        <select
          value={selectedFlashModel}
          onChange={(event) => setSelectedFlashModel(event.target.value as BrainstormFlashModel)}
          disabled={isConnected || isStarting}
          aria-label="Flash worker model"
          className="h-10 w-16 cursor-pointer appearance-none text-center rounded-xl bg-transparent px-2 text-xs font-medium text-stone-400 outline-none transition-colors hover:text-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {BRAINSTORM_FLASH_MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-stone-900 text-stone-300">
              {option.label}
            </option>
          ))}
        </select>
        <div className="h-6 w-px bg-white/10" />
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
