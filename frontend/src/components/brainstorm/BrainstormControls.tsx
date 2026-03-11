import type { Dispatch, SetStateAction } from 'react'
import { cn } from '@/lib/utils'
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
  sendSnapshot: () => void
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
  sendSnapshot,
  layout,
}: BrainstormControlsProps) {
  const isMobile = layout === 'mobile'

  return (
    <>
      <div
        className={cn(
          isMobile
            ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]'
            : 'mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]',
        )}
      >
        <label
          className={cn(
            'flex flex-col justify-center border border-white/[0.05] bg-white/[0.02] text-xs font-medium text-stone-300',
            isMobile
              ? 'order-2 min-h-12 rounded-2xl px-4 py-3 lg:order-1'
              : 'min-h-11 rounded-xl border-white/[0.06] px-3 py-2',
          )}
        >
          <span className="mb-1 text-[10px] uppercase tracking-[0.2em] text-stone-600">Flash worker model</span>
          <select
            value={selectedFlashModel}
            onChange={(event) => setSelectedFlashModel(event.target.value as BrainstormFlashModel)}
            disabled={isConnected || isStarting}
            aria-label="Flash worker model"
            className={cn(
              'min-h-11 cursor-pointer border border-white/[0.06] bg-stone-950 px-3 text-sm text-white outline-none transition-colors focus:border-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50',
              isMobile ? 'rounded-xl' : 'rounded-lg',
            )}
          >
            {BRAINSTORM_FLASH_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div
          className={cn(
            isMobile
              ? 'order-1 flex flex-col gap-3 sm:flex-row lg:order-2'
              : 'flex items-center gap-3',
          )}
        >
          {!isConnected ? (
            <ShimmerButton
              onClick={handleConnect}
              disabled={isStarting}
              shimmerColor="#fbbf24"
              shimmerDuration="2.5s"
              background="linear-gradient(135deg, #d97706, #b45309)"
              borderRadius={isMobile ? '16px' : '12px'}
              className={cn(
                'flex items-center justify-center gap-2.5 text-sm font-bold text-stone-950 shadow-[0_8px_32px_rgba(217,119,6,0.25)] disabled:cursor-not-allowed disabled:opacity-40',
                isMobile ? 'min-h-12 flex-1 px-5 py-3' : 'flex-1 px-5 py-3',
              )}
            >
              <GeminiMicOn className="size-4" />
              {isStarting ? 'Connecting…' : 'Start Brainstorm'}
            </ShimmerButton>
          ) : (
            <PulsatingButton
              onClick={stop}
              pulseColor="rgba(220, 38, 38, 0.3)"
              duration="2s"
              className={cn(
                'flex items-center justify-center gap-2.5 bg-red-600 text-sm font-bold text-white shadow-[0_8px_32px_rgba(220,38,38,0.25)] hover:bg-red-500',
                isMobile ? 'min-h-12 flex-1 rounded-2xl px-5 py-3' : 'flex-1 rounded-xl px-5 py-3',
              )}
            >
              <GeminiMicOff className="size-4" />
              End Session
            </PulsatingButton>
          )}

          <Button
            onClick={sendSnapshot}
            disabled={!isConnected}
            variant="outline"
            className={cn(
              'flex cursor-pointer items-center gap-2 border-amber-500/20 bg-amber-500/[0.08] text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-30',
              isMobile ? 'min-h-12 flex-1 justify-center rounded-2xl px-4 py-3' : 'shrink-0 rounded-xl px-4 py-3',
            )}
          >
            <GeminiStar className="size-4" />
            Save Snapshot
          </Button>
        </div>
      </div>

      <div className={cn(isMobile && 'mt-3 rounded-2xl border border-white/[0.05] bg-stone-950/70 p-2')}>
        <div className={cn('flex', isMobile ? 'gap-2' : 'gap-2.5')}>
          <Input
            type="text"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder={isConnected ? 'Type a message…' : 'Connect first to chat'}
            disabled={!isConnected}
            aria-label="Message input"
            className={cn(
              'flex-1 border-white/[0.06] bg-white/[0.03] text-white outline-none transition-colors placeholder:text-stone-600 focus:border-amber-500/30 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40',
              isMobile
                ? 'min-h-11 rounded-2xl px-4 py-3 text-base'
                : 'rounded-xl px-4 py-2.5 text-sm',
            )}
          />
          <Button
            onClick={handleSend}
            disabled={!isConnected || !inputText.trim()}
            aria-label="Send message"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center bg-amber-600/80 text-stone-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-30',
              isMobile ? 'size-11 rounded-2xl' : 'size-10 rounded-xl',
            )}
          >
            <GeminiSend className="size-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
