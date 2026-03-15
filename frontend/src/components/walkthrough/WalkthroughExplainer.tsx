import { motion } from 'framer-motion'
import {
  Mic,
  Server,
  Search,
  MessageSquareText,
  AudioLines,
} from 'lucide-react'

const steps = [
  {
    icon: Mic,
    title: 'Voice & text input',
    description:
      'Your voice is captured and streamed to the app backend. You can also type questions directly — both travel through the same live session.',
  },
  {
    icon: Server,
    title: 'Realtime Gemini Live session',
    description:
      'The backend maintains a realtime Gemini Live audio session that handles the voice conversation, including input and output transcription.',
  },
  {
    icon: Search,
    title: 'Project grounding via tool call',
    description:
      'When you ask a project question, the live model requests context through a tool call. The backend fulfills it by calling a separate Gemini model backed by a File Search store containing project documentation.',
  },
  {
    icon: MessageSquareText,
    title: 'Grounded response',
    description:
      'The File Search result is returned into the live conversation. Gemini then answers using the retrieved project context so responses stay accurate and grounded.',
  },
  {
    icon: AudioLines,
    title: 'Live transcription',
    description:
      'Both your speech and Gemini\'s audio responses are transcribed in real time, so you can follow the conversation visually as it happens.',
  },
]

export function WalkthroughExplainer() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-stone-200">
          How this walkthrough works
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          A voice-guided tour of the Voidpilot project, powered by Gemini Live
          and grounded in project documentation.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.li
              key={step.title}
              className="flex gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-stone-300">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                  {step.description}
                </p>
              </div>
            </motion.li>
          )
        })}
      </ol>

      <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
        This walkthrough is scoped to the Voidpilot project. It does not provide
        general-purpose assistance, scan your local files, or connect directly
        to Gemini from the browser.
      </p>
    </div>
  )
}
