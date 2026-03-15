import { useCallback, useRef, useState } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalkthroughComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function WalkthroughComposer({
  onSend,
  disabled = false,
  placeholder = 'Type a question…',
}: WalkthroughComposerProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    inputRef.current?.focus()
  }, [value, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    },
    [submit],
  )

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 backdrop-blur-sm transition-colors focus-within:border-amber-500/30 focus-within:bg-white/[0.05]">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Type a question for the walkthrough"
        className="min-w-0 flex-1 bg-transparent text-sm text-stone-200 outline-none placeholder:text-stone-600 disabled:opacity-50"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="shrink-0 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30"
      >
        <SendHorizonal />
      </Button>
    </div>
  )
}
