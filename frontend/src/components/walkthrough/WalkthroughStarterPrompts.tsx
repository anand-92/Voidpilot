import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const STARTER_PROMPTS = [
  'What is Voidpilot and what can it do?',
  'How does the voice assistant work?',
  'What technologies power this app?',
  'Tell me about the brainstorm mode.',
]

interface WalkthroughStarterPromptsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function WalkthroughStarterPrompts({
  onSelect,
  disabled = false,
}: WalkthroughStarterPromptsProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10">
        <Sparkles className="size-5 text-amber-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-200">
          Talk to Voidpilot
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-stone-500">
          Ask anything about the project using your voice or text. Try one of
          these to get started:
        </p>
      </div>
      <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            onClick={() => onSelect(prompt)}
            disabled={disabled}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.2 }}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left text-xs leading-relaxed text-stone-400 transition-colors hover:border-amber-500/20 hover:bg-amber-500/5 hover:text-stone-300 disabled:pointer-events-none disabled:opacity-50"
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
