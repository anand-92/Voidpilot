import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  HelpCircle,
  LayoutTemplate,
  Link as LinkIcon,
  Menu,
  Share2,
  X,
  Sparkles,
  MessageSquare,
  Image,
  Video,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface SparkToolbarProps {
  onGoBack?: () => void
  onResetLayout: () => void
  onCreateShare?: () => Promise<string | null>
  compact?: boolean
}

const helpTips = [
  {
    icon: Mic,
    title: 'Just talk naturally',
    description:
      'Give short, simple answers. Say what you had for lunch, describe what you see -- the AI turns the mundane into something cinematic.',
  },
  {
    icon: Image,
    title: 'Ask for images',
    description:
      'Say "generate that" or "show me" and the AI will create visuals on the fly. It loves making images -- let it.',
  },
  {
    icon: Video,
    title: 'Request videos too',
    description:
      'The AI can generate short video clips. Say "make it a video" or "animate that" to bring ideas to life.',
  },
  {
    icon: MessageSquare,
    title: 'Steer with short replies',
    description:
      '"Yes", "make it darker", "add a dog", "scarier" -- short reactions keep the creative flow going fast.',
  },
  {
    icon: Sparkles,
    title: 'Let the AI lead',
    description:
      'You don\'t need big ideas. The AI pitches concepts and you react. Just ride the wave and see where it goes.',
  },
]

export function SparkToolbar({ onGoBack, onResetLayout, onCreateShare }: SparkToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleShare = useCallback(async () => {
    if (!onCreateShare || shareState === 'loading') return
    setShareState('loading')
    try {
      const shareUrl = await onCreateShare()
      if (shareUrl) {
        const message = `Hey checkout my creative brainstorm I did with Voidpilot! ${shareUrl}`
        await navigator.clipboard.writeText(message)
        setShareMessage(message)
        setShareOpen(true)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2500)
      } else {
        setShareState('idle')
      }
    } catch {
      setShareState('idle')
    }
  }, [onCreateShare, shareState])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false)
      }
    }
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  return (
    <>
      <div ref={toolbarRef} className="flex items-center gap-2">
        {onGoBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoBack}
            className="shrink-0 size-11 rounded-2xl border border-white/[0.12] bg-black/80 text-stone-300 shadow-2xl shadow-orange-500/5 backdrop-blur-xl transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}

        <motion.div
          layout
          className="flex items-center gap-2 overflow-hidden rounded-2xl border border-white/[0.12] bg-black/80 p-1 shadow-2xl shadow-orange-500/5 backdrop-blur-xl"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded((v) => !v)}
            className="shrink-0 size-11 rounded-xl text-orange-400 transition-colors hover:bg-orange-500/[0.1] hover:text-orange-300"
            aria-label={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
          >
            {isExpanded ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex items-center gap-1 overflow-hidden pr-1"
              >
                <Button
                  variant="ghost"
                  onClick={onResetLayout}
                  className="h-10 gap-2 whitespace-nowrap rounded-xl px-3 text-sm text-stone-300 hover:bg-white/[0.08] hover:text-white"
                >
                  <LayoutTemplate className="size-4" />
                  Reset
                </Button>
                {onCreateShare && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void handleShare()
                      setIsExpanded(false)
                    }}
                    disabled={shareState === 'loading'}
                    className="h-10 gap-2 whitespace-nowrap rounded-xl px-3 text-sm text-stone-300 hover:bg-white/[0.08] hover:text-white"
                  >
                    {shareState === 'copied' ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : shareState === 'loading' ? (
                      <LinkIcon className="size-4 animate-pulse" />
                    ) : (
                      <Share2 className="size-4" />
                    )}
                    {shareState === 'copied' ? 'Copied!' : 'Share'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHelpOpen(true)
                    setIsExpanded(false)
                  }}
                  className="h-10 gap-2 whitespace-nowrap rounded-xl px-3 text-sm text-orange-400 hover:bg-orange-500/[0.1] hover:text-orange-300"
                >
                  <HelpCircle className="size-4" />
                  Help
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          className="!max-w-md border-white/[0.08] bg-stone-950/95 backdrop-blur-3xl text-white"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                <Sparkles className="size-3.5 text-white" />
              </div>
              Getting the most out of Creative Spark
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              Creative Spark is voice-first and AI-driven. Here is how to make
              it shine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {helpTips.map((tip) => (
              <div
                key={tip.title}
                className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/[0.08]">
                  <tip.icon className="size-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{tip.title}</p>
                  <p className="text-xs leading-relaxed text-stone-400">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent
          className="!max-w-lg border-white/[0.08] bg-stone-950/95 backdrop-blur-3xl text-white"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-white">Copied to clipboard</DialogTitle>
            <DialogDescription className="text-stone-400">
              Your share message is ready to paste.
            </DialogDescription>
          </DialogHeader>

          <Input value={shareMessage} readOnly className="h-24 rounded-xl border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-stone-200" />
        </DialogContent>
      </Dialog>
    </>
  )
}
