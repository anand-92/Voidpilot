import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { PulsatingButton } from '@/components/ui/pulsating-button'
import {
  GeminiMicOff,
  GeminiMicOn,
  GeminiSend,
} from '../icons/GeminiIcons'
import { cn } from '@/lib/utils'

type CreativeSparkControlsProps = {
  isConnected: boolean
  isStarting: boolean
  inputText: string
  setInputText: (value: string) => void
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  layout: 'desktop' | 'mobile'
}

/**
 * Simplified controls for Creative Spark mode.
 *
 * Voice-first: connection button + text input only.
 * No tool toggles (Artifact/Image/Video) or model selector (LITE/FLASH/PRO)
 * — those are Open Studio elements only.
 */
export function CreativeSparkControls({
  isConnected,
  isStarting,
  inputText,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  layout,
}: CreativeSparkControlsProps) {
  const isCompact = layout === 'mobile'

  return (
    <div className={cn(
      'flex flex-col gap-3 shrink-0 relative z-10',
      !isCompact && 'p-4 border-t border-white/[0.08] bg-black/20',
    )}>
      {/* Connection button */}
      {!isConnected ? (
        <ShimmerButton
          onClick={handleConnect}
          disabled={isStarting}
          shimmerColor="#fb923c"
          shimmerDuration="2.5s"
          background="linear-gradient(135deg, #f97316, #c2410c)"
          borderRadius="16px"
          className={cn(
            'flex items-center justify-center gap-2 text-sm font-bold text-stone-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40',
            isCompact ? 'min-h-12 px-3 py-3' : 'py-3',
          )}
        >
          <GeminiMicOn className="size-4" />
          {isStarting ? 'Connecting…' : 'Start Sparking'}
        </ShimmerButton>
      ) : (
        <PulsatingButton
          onClick={stop}
          pulseColor={isCompact ? 'rgba(220, 38, 38, 0.3)' : 'rgba(220, 38, 38, 0.4)'}
          duration="2s"
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-lg backdrop-blur-md hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50',
            isCompact
              ? 'min-h-12 px-4 py-3 text-sm bg-red-600'
              : 'py-3 text-sm bg-red-500/90',
          )}
        >
          <GeminiMicOff className="size-4" />
          End Session
        </PulsatingButton>
      )}

      {/* Text input */}
      <div className={cn(
        'flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5 backdrop-blur-md relative overflow-hidden',
        isCompact && 'p-2',
      )}>
        <Input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isConnected
            ? (isCompact ? 'Type a message…' : 'Type your thoughts…')
            : (isCompact ? 'Connect first to chat' : 'Connect to start sparking…')}
          disabled={!isConnected}
          aria-label="Message input"
          className={cn(
            'flex-1 border-0 bg-transparent text-sm text-white shadow-none focus-visible:ring-0 placeholder:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50',
            isCompact ? 'min-h-11 h-auto px-4 py-3' : 'h-10 px-3',
          )}
        />
        <Button
          onClick={handleSend}
          disabled={!isConnected || !inputText.trim()}
          aria-label="Send message"
          className={cn(
            'shrink-0 cursor-pointer rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-stone-950 shadow-md transition-transform hover:scale-105 hover:from-orange-400 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100',
            isCompact ? 'size-11' : 'size-10',
          )}
        >
          <GeminiSend className={cn('size-4', !isCompact && 'translate-x-[-1px] translate-y-[1px]')} />
        </Button>
      </div>
    </div>
  )
}
