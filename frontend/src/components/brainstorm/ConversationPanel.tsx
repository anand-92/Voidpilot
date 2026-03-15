import { useCallback, useEffect, useState, type RefObject } from 'react'
import { Share2, Check, Link as LinkIcon, Mic, MicOff, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Message } from '@/types/messages'
import { GeminiChat } from '../icons/GeminiIcons'
import { IconBrainstorm } from '../icons/CustomIcons'
import { MessageBubble } from '../SharedUI'

type ConversationPanelProps = {
  messages: Message[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  mobile: boolean
  sessionTitle?: string | null
  onCreateShare?: () => Promise<string | null>
  isConnected?: boolean
  isStarting?: boolean
  isMicPaused?: boolean
  handleConnect?: () => Promise<void>
  stop?: () => void
  toggleMicPause?: () => void
}

export function ConversationPanel({ messages, messagesEndRef, mobile, sessionTitle, onCreateShare, isConnected, isStarting, isMicPaused, handleConnect, stop, toggleMicPause }: ConversationPanelProps) {
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, messagesEndRef])

  const handleShare = useCallback(async () => {
    if (!onCreateShare || shareState === 'loading') return
    setShareState('loading')
    try {
      const shareUrl = await onCreateShare()
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2500)
      } else {
        setShareState('idle')
      }
    } catch {
      setShareState('idle')
    }
  }, [onCreateShare, shareState])

  return (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 px-5 py-3',
          mobile ? 'border-b border-white/[0.05] px-4 py-4' : 'bg-stone-950/40',
        )}
      >
        <GeminiChat className="size-4 text-amber-400" />
        <span className="min-w-0 truncate text-sm font-semibold text-white">
          {sessionTitle ?? 'Conversation'}
        </span>
        {onCreateShare && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleShare}
            disabled={shareState === 'loading'}
            className={cn(
              'ml-1 size-7 shrink-0 rounded-lg transition-all',
              shareState === 'copied'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-stone-500 hover:bg-white/[0.06] hover:text-stone-300',
            )}
            title={shareState === 'copied' ? 'Link copied!' : 'Share session'}
          >
            {shareState === 'copied' ? (
              <Check className="size-3.5" />
            ) : shareState === 'loading' ? (
              <LinkIcon className="size-3.5 animate-pulse" />
            ) : (
              <Share2 className="size-3.5" />
            )}
          </Button>
        )}
        <Badge
          variant="outline"
          className="ml-auto shrink-0 border-transparent bg-transparent px-0 text-[10px] font-medium uppercase tracking-widest text-stone-600"
        >
          {messages.length} messages
        </Badge>
      </div>

      {!mobile && <Separator className="bg-white/[0.04]" />}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          mobile ? 'px-4 py-4' : 'px-5 py-4',
        )}
      >
        {messages.length === 0 ? (
          <div
            className={cn(
              'relative flex flex-col items-center justify-center gap-4 text-center',
              mobile ? 'h-full py-10' : 'h-full',
            )}
          >
            <div className="relative z-10 flex size-20 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.4)] animate-pulse">
              <IconBrainstorm className="size-10 text-orange-500" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-stone-400">Ready to brainstorm</p>
              <p
                className={cn(
                  'mt-1',
                  mobile ? 'text-sm leading-6 text-stone-500' : 'text-xs text-stone-600',
                )}
              >
                {mobile
                  ? 'Connect and start talking. Gemini will help shape ideas and create assets.'
                  : 'Connect and start talking — Gemini will help develop your ideas.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => {
              const isLatest = index === messages.length - 1
              const isSecondLast = index === messages.length - 2
              return (
                <div
                  key={index}
                  className={cn(
                    'transition-opacity duration-500',
                    isLatest
                      ? 'opacity-100'
                      : isSecondLast
                        ? 'opacity-30'
                        : 'opacity-10',
                  )}
                >
                  <MessageBubble
                    role={message.role}
                    content={message.content}
                    isToolResponse={message.isToolResponse}
                  />
                  {isLatest && message.role !== 'system' && isConnected && (
                    <span className="ml-4 mt-1 inline-block h-4 w-0.5 animate-pulse bg-amber-500/60" />
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Connection / Pause / Resume button */}
      {handleConnect && stop && (
        <div className="shrink-0 flex justify-center px-4 py-3 border-t border-white/[0.04] bg-black/40 backdrop-blur-xl">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isStarting}
              className={cn(
                'relative flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-bold transition-all',
                'bg-blue-600/20 border border-blue-500/40 text-blue-300',
                'shadow-[0_0_30px_rgba(59,130,246,0.4),0_0_60px_rgba(59,130,246,0.15)]',
                'hover:bg-blue-600/30 hover:shadow-[0_0_40px_rgba(59,130,246,0.5),0_0_80px_rgba(59,130,246,0.2)]',
                'hover:border-blue-400/60 active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
              )}
            >
              <Mic className="size-4" />
              {isStarting ? 'Connecting...' : 'Start Speaking'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMicPause}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-bold transition-all',
                  isMicPaused
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:bg-blue-600/30 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)]'
                    : 'bg-amber-600/20 border border-amber-500/40 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:bg-amber-600/30 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]',
                  'active:scale-95',
                )}
              >
                {isMicPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                {isMicPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={stop}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-bold transition-all',
                  'bg-red-600/20 border border-red-500/40 text-red-300',
                  'shadow-[0_0_20px_rgba(220,38,38,0.3)]',
                  'hover:bg-red-600/30 hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]',
                  'active:scale-95',
                )}
              >
                <MicOff className="size-4" />
                End
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
