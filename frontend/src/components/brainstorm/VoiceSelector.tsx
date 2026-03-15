import type { Dispatch, SetStateAction } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BRAINSTORM_VOICE_OPTIONS,
  type BrainstormVoice,
} from '@/hooks/useGeminiBrainstorm'
import { cn } from '@/lib/utils'

type VoiceSelectorProps = {
  selectedVoice: BrainstormVoice
  setSelectedVoice: Dispatch<SetStateAction<BrainstormVoice>>
  disabled: boolean
  compact?: boolean
}

export function VoiceSelector({
  selectedVoice,
  setSelectedVoice,
  disabled,
  compact,
}: VoiceSelectorProps) {
  const current = BRAINSTORM_VOICE_OPTIONS.find((v) => v.value === selectedVoice)

  return (
    <Select
      value={selectedVoice}
      onValueChange={(val) => setSelectedVoice(val as BrainstormVoice)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'border-white/[0.08] bg-white/[0.03] text-stone-300 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
          compact ? 'h-9 min-w-[120px] text-xs' : 'h-10 min-w-[140px] text-sm',
        )}
      >
        <SelectValue>
          {current ? `${current.label}` : 'Voice'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="max-h-64 border-white/[0.1] bg-stone-950/95 text-stone-200 backdrop-blur-xl"
        side="top"
        sideOffset={8}
      >
        {BRAINSTORM_VOICE_OPTIONS.map((voice) => (
          <SelectItem
            key={voice.value}
            value={voice.value}
            className="focus:bg-white/[0.08] focus:text-white"
          >
            <span>{voice.label}</span>
            <span className="ml-1 text-stone-500">{voice.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
