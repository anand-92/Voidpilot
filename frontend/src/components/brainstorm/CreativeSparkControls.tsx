import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { PulsatingButton } from '@/components/ui/pulsating-button'
import {
  BRAINSTORM_TOOL_OPTIONS,
  type BrainstormToolId,
  type BrainstormVoice,
} from '@/hooks/useGeminiBrainstorm'
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
  selectedTools?: BrainstormToolId[]
  setSelectedTools?: Dispatch<SetStateAction<BrainstormToolId[]>>
  showToolSelector?: boolean
  startLabel?: string
  onResetLayout?: () => void
  onCreateShare?: () => Promise<string | null>
  onGoBack?: () => void
}

/**
 * Floating brainstorm controls shared by Creative Spark and Open Studio.
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
  selectedTools,
  setSelectedTools,
  showToolSelector = false,
  startLabel,
  onResetLayout,
  onCreateShare,
  onGoBack,
}: CreativeSparkControlsProps) {
  const isDisabled = isConnected || isStarting
  const startActionLabel = (startLabel ?? 'Start Sparking').toLowerCase()
  const toolSelectorTools = showToolSelector && selectedTools && setSelectedTools && !isConnected
    ? selectedTools
    : null

  const handleToolToggle = (toolId: BrainstormToolId) => {
    if (!setSelectedTools) {
      return
    }

    setSelectedTools((previous) => (
      previous.includes(toolId)
        ? previous.filter((currentToolId) => currentToolId !== toolId)
        : [...previous, toolId]
    ))
  }

  return (
    <div className="flex flex-col gap-2">
      {toolSelectorTools ? (
        <div className="flex flex-wrap items-center justify-center gap-2 px-2">
          {BRAINSTORM_TOOL_OPTIONS.map((tool) => {
            const isSelected = toolSelectorTools.includes(tool.id)

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolToggle(tool.id)}
                disabled={isDisabled}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50',
                  isSelected
                    ? 'border-blue-400/40 bg-blue-500/20 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'border-white/[0.08] bg-black/50 text-stone-400 hover:bg-white/[0.08] hover:text-stone-200',
                ].join(' ')}
              >
                {tool.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/60 p-1.5 pr-3 shadow-2xl backdrop-blur-2xl">
        <VoiceSelector
          selectedVoice={selectedVoice}
          setSelectedVoice={setSelectedVoice}
          disabled={isDisabled}
          compact
        />

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
            {isStarting ? 'Connecting…' : (startLabel ?? 'Start Sparking')}
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

        <Input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isToolRunning && !isStarting) {
              void handleSend()
            }
          }}
          placeholder={isConnected ? (isToolRunning ? 'Wait for the tool to finish…' : 'Type a message…') : `Type a message to ${startActionLabel}…`}
          disabled={isToolRunning || isStarting}
          aria-label="Message input"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white shadow-none focus-visible:ring-0 placeholder:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50 h-9 px-3"
        />
        <Button
          onClick={() => void handleSend()}
          disabled={isStarting || isToolRunning || !inputText.trim()}
          aria-label="Send message"
          className="shrink-0 cursor-pointer rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-stone-950 shadow-md transition-transform size-9 hover:scale-105 hover:from-orange-400 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <GeminiSend className="size-4" />
        </Button>

        {layout === 'desktop' && onResetLayout ? (
          <div className="pl-2">
            <SparkToolbar onGoBack={onGoBack} onResetLayout={onResetLayout} onCreateShare={onCreateShare} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
