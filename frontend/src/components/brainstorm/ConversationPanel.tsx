import type { RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { DotPattern } from '@/components/ui/dot-pattern'
import type { Message } from '../../hooks/useGeminiLive'
import { GeminiChat } from '../icons/GeminiIcons'
import { IconBrainstorm } from '../icons/CustomIcons'
import { MessageBubble } from '../SharedUI'

type ConversationPanelProps = {
  messages: Message[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  mobile: boolean
}

export function ConversationPanel({ messages, messagesEndRef, mobile }: ConversationPanelProps) {
  return (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 px-5 py-3',
          mobile ? 'border-b border-white/[0.05] px-4 py-4' : 'bg-stone-950/40',
        )}
      >
        <GeminiChat className="size-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Conversation</span>
        <Badge
          variant="outline"
          className="ml-auto border-transparent bg-transparent px-0 text-[10px] font-medium uppercase tracking-widest text-stone-600"
        >
          {messages.length} messages
        </Badge>
      </div>

      {!mobile && <Separator className="bg-white/[0.04]" />}

      <ScrollArea
        className={cn(
          'min-h-0 flex-1',
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
            <DotPattern
              className="absolute inset-0 text-amber-500/[0.04]"
              width={20}
              height={20}
              cr={0.6}
            />
            <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-stone-900/60">
              <IconBrainstorm className="size-7 text-amber-500/30" />
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
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                role={message.role}
                content={message.content}
                isToolResponse={message.isToolResponse}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
    </>
  )
}
