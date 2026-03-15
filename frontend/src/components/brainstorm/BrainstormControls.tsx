import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { PulsatingButton } from '@/components/ui/pulsating-button'
import {
  BRAINSTORM_FLASH_MODEL_OPTIONS,
  BRAINSTORM_TOOL_OPTIONS,
  type BrainstormFlashModel,
  type BrainstormToolId,
  type BrainstormVoice,
} from '../../hooks/useGeminiBrainstorm'
import {
  GeminiMicOff,
  GeminiMicOn,
  GeminiSend,
} from '../icons/GeminiIcons'
import { VoiceSelector } from './VoiceSelector'
import { cn } from '@/lib/utils'

type BrainstormControlsProps = {
  isConnected: boolean
  isStarting: boolean
  isToolRunning: boolean
  selectedFlashModel: BrainstormFlashModel
  setSelectedFlashModel: Dispatch<SetStateAction<BrainstormFlashModel>>
  selectedVoice: BrainstormVoice
  setSelectedVoice: Dispatch<SetStateAction<BrainstormVoice>>
  selectedTools: BrainstormToolId[]
  setSelectedTools: Dispatch<SetStateAction<BrainstormToolId[]>>
  inputText: string
  setInputText: (value: string) => void
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  layout: 'desktop' | 'mobile'
}

// Helper component for tool selector buttons
function ToolSelector({
  selectedTools,
  onToggle,
  disabled,
  compact,
}: {
  selectedTools: BrainstormToolId[]
  onToggle: (toolId: BrainstormToolId) => void
  disabled: boolean
  compact?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-1.5 mb-3 px-1", !compact && "mb-0 px-0")}>
      {BRAINSTORM_TOOL_OPTIONS.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToggle(tool.id)}
          disabled={disabled}
          className={cn(
            "flex-1 rounded-lg text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "py-1.5 px-2" : "py-2 px-3",
            selectedTools.includes(tool.id)
              ? "bg-amber-600/80 text-stone-950 shadow-md"
              : "bg-white/[0.05] text-stone-400 border border-white/[0.08] hover:bg-white/[0.08]"
          )}
        >
          {tool.label}
        </button>
      ))}
    </div>
  )
}

// Helper component for model toggle button
function ModelToggle({
  model,
  onToggle,
  disabled,
  layout,
}: {
  model: BrainstormFlashModel
  onToggle: () => void
  disabled: boolean
  layout: 'desktop' | 'mobile'
}) {
  const label = BRAINSTORM_FLASH_MODEL_OPTIONS.find(opt => opt.value === model)?.label ?? 'LITE'
  const isCompact = layout === 'mobile'

  const gradientClass = model === 'gemini-3.1-pro'
    ? "from-blue-500/10 to-purple-500/10"
    : model === 'gemini-3-flash'
    ? "from-amber-500/10 to-orange-500/10"
    : ""

  const textClass = cn(
    "flex items-center justify-center cursor-pointer text-xs font-bold tracking-wider outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 relative z-10",
    model === 'gemini-3.1-pro' && "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]",
    model === 'gemini-3-flash' && "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]",
    model === 'gemini-3.1-flash-lite' && "text-stone-400 font-medium hover:bg-white/[0.04]"
  )

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02]",
      isCompact ? "w-[80px] min-h-12" : "w-[72px] h-10"
    )}>
      {gradientClass && (
        <div className={cn("absolute inset-0 blur-xl animate-pulse", gradientClass)} />
      )}
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-label="Toggle flash worker model"
        className={cn(textClass, isCompact ? "min-h-12 px-2" : "h-10 w-[72px] px-2")}
      >
        {label}
      </button>
    </div>
  )
}

// Helper component for connection button
function ConnectionButton({
  isConnected,
  isStarting,
  onConnect,
  onStop,
  layout,
}: {
  isConnected: boolean
  isStarting: boolean
  onConnect: () => Promise<void>
  onStop: () => void
  layout: 'desktop' | 'mobile'
}) {
  const isCompact = layout === 'mobile'

  if (!isConnected) {
    return (
      <ShimmerButton
        onClick={onConnect}
        disabled={isStarting}
        shimmerColor="#fbbf24"
        shimmerDuration="2.5s"
        background="linear-gradient(135deg, #d97706, #b45309)"
        borderRadius="16px"
        className={cn(
          "flex items-center justify-center gap-2 text-sm font-bold text-stone-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40",
          isCompact ? "min-h-12 flex-1 px-3 py-3" : "flex-1 py-3"
        )}
      >
        <GeminiMicOn className="size-4" />
        {isStarting ? 'Connecting…' : isCompact ? 'Start' : 'Connect'}
      </ShimmerButton>
    )
  }

  return (
    <PulsatingButton
      onClick={onStop}
      pulseColor={isCompact ? "rgba(220, 38, 38, 0.3)" : "rgba(220, 38, 38, 0.4)"}
      duration="2s"
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-lg backdrop-blur-md hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50",
        isCompact 
          ? "min-h-12 flex-1 px-4 py-3 text-sm bg-red-600" 
          : "flex-1 py-3 text-sm bg-red-500/90"
      )}
    >
      {layout === 'desktop' && <GeminiMicOff className="size-4" />}
      {isCompact ? 'End Session' : 'End Session'}
    </PulsatingButton>
  )
}

// Helper component for message input
function MessageInput({
  inputText,
  onChange,
  onSend,
  isConnected,
  isToolRunning,
  layout,
}: {
  inputText: string
  onChange: (value: string) => void
  onSend: () => void
  isConnected: boolean
  isToolRunning: boolean
  layout: 'desktop' | 'mobile'
}) {
  const isCompact = layout === 'mobile'

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5 backdrop-blur-md relative overflow-hidden",
      isCompact ? "mt-3 p-2" : ""
    )}>
      <Input
        type="text"
        value={inputText}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !isToolRunning && onSend()}
        placeholder={isConnected
          ? isToolRunning
            ? (isCompact ? 'Tool running…' : 'Wait for the tool to finish…')
            : (isCompact ? 'Type a message…' : 'Message Gemini...')
          : (isCompact ? 'Connect first to chat' : 'Connect to brainstorm...')}
        disabled={!isConnected || isToolRunning}
        aria-label="Message input"
        className={cn(
          "flex-1 border-0 bg-transparent text-sm text-white shadow-none focus-visible:ring-0 placeholder:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50",
          isCompact ? "min-h-11 h-auto px-4 py-3" : "h-10 px-3"
        )}
      />
      <Button
        onClick={onSend}
        disabled={!isConnected || isToolRunning || !inputText.trim()}
        aria-label="Send message"
        className={cn(
          "shrink-0 cursor-pointer rounded-xl bg-gradient-to-br text-stone-950 shadow-md transition-transform hover:scale-105 hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
          isCompact 
            ? "size-11 from-amber-500 to-orange-600" 
            : "size-10 from-amber-500 to-orange-600"
        )}
      >
        <GeminiSend className={cn("size-4", !isCompact && "translate-x-[-1px] translate-y-[1px]")} />
      </Button>
    </div>
  )
}

export function BrainstormControls({
  isConnected,
  isStarting,
  isToolRunning,
  selectedFlashModel,
  setSelectedFlashModel,
  selectedVoice,
  setSelectedVoice,
  selectedTools,
  setSelectedTools,
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

  const handleToolToggle = (toolId: BrainstormToolId) => {
    setSelectedTools(prev => 
      prev.includes(toolId)
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    )
  }

  const isDisabled = isConnected || isStarting

  if (isMobile) {
    return (
      <>
        <ToolSelector
          selectedTools={selectedTools}
          onToggle={handleToolToggle}
          disabled={isDisabled}
          compact
        />

        <div className="flex items-center gap-2">
          <ModelToggle
            model={selectedFlashModel}
            onToggle={handleModelToggle}
            disabled={isDisabled}
            layout="mobile"
          />

          <VoiceSelector
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            disabled={isDisabled}
            compact
          />

          <ConnectionButton
            isConnected={isConnected}
            isStarting={isStarting}
            onConnect={handleConnect}
            onStop={stop}
            layout="mobile"
          />
        </div>

        <MessageInput
          inputText={inputText}
          onChange={setInputText}
          onSend={handleSend}
          isConnected={isConnected}
          isToolRunning={isToolRunning}
          layout="mobile"
        />
      </>
    )
  }

  // Desktop layout
  return (
    <div className="flex flex-col gap-3 p-4 shrink-0 border-t border-white/[0.08] bg-black/20 relative z-10">
      <ToolSelector
        selectedTools={selectedTools}
        onToggle={handleToolToggle}
        disabled={isDisabled}
      />

      <VoiceSelector
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        disabled={isDisabled}
      />

      <ConnectionButton
        isConnected={isConnected}
        isStarting={isStarting}
        onConnect={handleConnect}
        onStop={stop}
        layout="desktop"
      />

      <MessageInput
        inputText={inputText}
        onChange={setInputText}
        onSend={handleSend}
        isConnected={isConnected}
        isToolRunning={isToolRunning}
        layout="desktop"
      />
    </div>
  )
}
