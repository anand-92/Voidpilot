import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Loader2, AlertCircle, SearchX } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  WalkthroughTranscriptItem,
  WalkthroughTranscriptTurn,
  WalkthroughToolActivityEntry,
  WalkthroughToolActivity,
} from '@/types/walkthrough'

interface WalkthroughTranscriptProps {
  turns: WalkthroughTranscriptItem[]
  toolActivity: WalkthroughToolActivity
  emptyState: React.ReactNode
}

function InlineToolActivity({ entry }: { entry: WalkthroughToolActivityEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-300">
        {entry.status === 'searching' && (
          <>
            <Loader2 className="size-3 animate-spin" />
            <span>Looking up project context…</span>
          </>
        )}
        {entry.status === 'complete' && (
          <>
            <Search className="size-3" />
            <span>Project context retrieved</span>
          </>
        )}
        {entry.status === 'no_results' && (
          <>
            <SearchX className="size-3 text-yellow-400" />
            <span className="text-yellow-300">No matching project context found</span>
          </>
        )}
        {entry.status === 'error' && (
          <>
            <AlertCircle className="size-3 text-red-400" />
            <span className="text-red-300">Context lookup failed</span>
          </>
        )}
      </div>
    </motion.div>
  )
}

function TranscriptTurn({ turn }: { turn: WalkthroughTranscriptTurn }) {
  const isUser = turn.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col gap-1 px-4 py-2 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
        {isUser ? 'You' : 'Voidpilot'}
      </span>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-amber-500/10 text-stone-200'
            : 'bg-white/[0.04] text-stone-300'
        }`}
      >
        {turn.content}
      </div>
    </motion.div>
  )
}

function TranscriptItem({ item }: { item: WalkthroughTranscriptItem }) {
  if (item.role === 'tool_activity') {
    return <InlineToolActivity entry={item} />
  }
  return <TranscriptTurn turn={item} />
}

export function WalkthroughTranscript({
  turns,
  toolActivity,
  emptyState,
}: WalkthroughTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, toolActivity.status])

  const isEmpty = turns.length === 0

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="flex min-h-full flex-col">
        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            {emptyState}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-1 py-3">
            <AnimatePresence mode="popLayout">
              {turns.map((item, i) => (
                <TranscriptItem key={`${item.role}-${i}`} item={item} />
              ))}
            </AnimatePresence>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
