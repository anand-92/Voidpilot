import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BorderBeam } from '@/components/ui/border-beam'
import { BlurFade } from '@/components/ui/blur-fade'
import { MessageBubble } from './SharedUI'
import { GeminiChat, GeminiCheck, GeminiSend, GeminiStar } from './icons/GeminiIcons'
import type { Message } from '../hooks/useGeminiLive'
import type { RefObject } from 'react'

export type ChatAreaProps = {
  isConnected: boolean
  messages: Message[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  inputText: string
  setInputText: (text: string) => void
  handleSend: () => void
}

export function ChatArea({
  isConnected,
  messages,
  messagesEndRef,
  inputText,
  setInputText,
  handleSend,
}: ChatAreaProps) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      {isConnected && <BorderBeam size={60} duration={6} colorFrom="#d97706" colorTo="#b45309" />}

      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] bg-stone-950/40 px-5 py-3">
        <GeminiChat className="size-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Conversation</span>
        <Badge variant="secondary" className="ml-auto text-[10px] font-medium uppercase tracking-widest text-stone-500">
          {messages.length} messages
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-stone-900/60">
                <GeminiStar className="size-7 text-amber-500/30" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500">No messages yet</p>
                <p className="mt-1 text-xs text-stone-600">Start a session to begin talking with Gemini.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message, index) => (
                <BlurFade key={index} delay={0.03} duration={0.25}>
                  <MessageBubble role={message.role} content={message.content} />
                </BlurFade>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-white/[0.04] bg-stone-950/40 px-5 py-3.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
          <GeminiCheck className="size-3.5 text-amber-500/40" />
          Quick prompt
        </div>
        <div className="mt-2.5 flex gap-2.5">
          <Input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder={isConnected ? 'Type a message...' : 'Connect first to chat'}
            disabled={!isConnected}
            aria-label="Message input"
            className="h-10 flex-1 rounded-xl border-white/[0.06] bg-stone-900/60 px-4 text-sm text-white placeholder:text-stone-600 focus-visible:border-amber-500/30 focus-visible:bg-stone-900/80"
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={handleSend}
                  disabled={!isConnected || !inputText.trim()}
                  aria-label="Send message"
                  size="icon-lg"
                  className="shrink-0 rounded-xl bg-amber-600/80 text-stone-950 hover:bg-amber-500"
                />
              }
            >
              <GeminiSend className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
