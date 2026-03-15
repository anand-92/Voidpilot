import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/ui/blur-fade'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

export function PulseRing({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="relative flex size-2.5">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
      <span className="relative inline-flex size-2.5 rounded-full bg-amber-400" />
    </span>
  )
}

export function StatusChip({ isConnected, isStarting }: { isConnected: boolean; isStarting: boolean }) {
  let label: string
  let chipClassName: string

  if (isConnected) {
    chipClassName = 'border-amber-500/20 bg-amber-500/10 text-amber-300'
    label = 'Live'
  } else if (isStarting) {
    chipClassName = 'border-orange-400/20 bg-orange-500/10 text-orange-300'
    label = 'Starting...'
  } else {
    chipClassName = 'border-stone-700 bg-stone-800/60 text-stone-500'
    label = 'Offline'
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-auto gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors',
        chipClassName,
      )}
    >
      <PulseRing active={isConnected} />
      {label}
    </Badge>
  )
}

const AI_STYLE = {
  bubble: 'border border-white/[0.06] bg-stone-900/60 text-stone-200',
  label: 'text-amber-500/60',
  name: 'Gemini',
  isMarkdown: true,
}

const AI_VOICE_STYLE = {
  ...AI_STYLE,
  isMarkdown: false,
}

const MESSAGE_STYLES: Record<string, { bubble: string; label: string; name: string; isMarkdown?: boolean }> = {
  user: {
    bubble: 'bg-amber-600/15 text-amber-50',
    label: 'text-amber-400/60',
    name: 'You',
  },
  user_voice: {
    bubble: 'bg-amber-600/15 text-amber-50',
    label: 'text-amber-400/60',
    name: 'You',
    isMarkdown: false,
  },
  system: {
    bubble: 'border border-white/[0.06] bg-white/[0.02] text-stone-500 italic',
    label: 'text-stone-600',
    name: 'System',
  },
  model: AI_STYLE,
  gemini: AI_STYLE,
  gemini_voice: AI_VOICE_STYLE,
}

const LABEL_CLASSES = 'mb-1 text-[10px] font-bold uppercase tracking-[0.2em]'

export function MessageBubble({
  role,
  content,
  isToolResponse,
}: {
  role: string
  content: string
  isToolResponse?: boolean
}) {
  const isUser = role === 'user' || role === 'user_voice'
  const styles = MESSAGE_STYLES[role] ?? MESSAGE_STYLES.model

  if (isToolResponse) {
    return (
      <BlurFade delay={0.05} duration={0.3}>
        <div className="flex justify-start">
          <div className="rainbow-border max-w-[90%] md:max-w-[80%] rounded-2xl p-[2px]">
            <div className="rounded-[14px] bg-stone-950 px-4 py-3 text-sm leading-relaxed text-stone-200">
              <div className={`${LABEL_CLASSES} ${AI_STYLE.label}`}>Gemini — Tool Result</div>
              {styles.isMarkdown ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-stone-900/50 prose-pre:border prose-pre:border-white/10">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{content}</div>
              )}
            </div>
          </div>
        </div>
      </BlurFade>
    )
  }

  return (
    <BlurFade delay={0.05} duration={0.3}>
      <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
        <div className={cn('max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed', styles.bubble)}>
          <div className={cn(LABEL_CLASSES, styles.label)}>{styles.name}</div>
          {styles.isMarkdown ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-stone-900/50 prose-pre:border prose-pre:border-white/10 prose-a:text-amber-500 hover:prose-a:text-amber-400">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          )}
        </div>
      </div>
    </BlurFade>
  )
}
