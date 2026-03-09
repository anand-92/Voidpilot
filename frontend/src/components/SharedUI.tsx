/* ─── Shared UI Atoms ──────────────────────────────────────────────
 * Extracted from App.tsx and BrainstormPage.tsx to avoid duplication.
 * Both pages import these components for consistent styling.
 * ────────────────────────────────────────────────────────────────── */

export function PulseRing({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
  )
}

export function StatusChip({ isConnected, isStarting }: { isConnected: boolean; isStarting: boolean }) {
  let colorClasses: string
  let label: string

  if (isConnected) {
    colorClasses = 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
    label = 'Live'
  } else if (isStarting) {
    colorClasses = 'border border-amber-400/20 bg-amber-500/10 text-amber-300'
    label = 'Starting…'
  } else {
    colorClasses = 'border border-white/10 bg-white/5 text-slate-400'
    label = 'Offline'
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors ${colorClasses}`}
    >
      <PulseRing active={isConnected} />
      {label}
    </div>
  )
}

const AI_STYLE = {
  bubble: 'border border-white/[0.06] bg-white/[0.04] text-slate-200',
  label: 'text-indigo-400/60',
  name: 'Gemini',
}

const MESSAGE_STYLES: Record<string, { bubble: string; label: string; name: string }> = {
  user: {
    bubble: 'bg-sky-600/20 text-sky-100',
    label: 'text-sky-400/60',
    name: 'You',
  },
  system: {
    bubble: 'border border-white/[0.06] bg-white/[0.03] text-slate-500 italic',
    label: 'text-slate-600',
    name: 'System',
  },
  // App.tsx uses "model", BrainstormPage uses "gemini" — both map to the same style
  model: AI_STYLE,
  gemini: AI_STYLE,
}

export function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user'
  const styles = MESSAGE_STYLES[role] ?? MESSAGE_STYLES.model
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${styles.bubble}`}>
        <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${styles.label}`}>
          {styles.name}
        </div>
        <div>{content}</div>
      </div>
    </div>
  )
}
