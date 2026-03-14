import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { StatusChip } from '../SharedUI'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'

/**
 * Mobile layout for Creative Spark mode.
 *
 * Placeholder layout for milestone 2's masonry gallery. Shows a distinct
 * Creative Spark workspace with conversation and voice controls.
 * Excludes all Open Studio elements (AgentVisualizer, WorkspacePanel,
 * tool toggles, model selector, workspace tab).
 */
export function CreativeSparkMobileLayout({
  isConnected,
  isStarting,
  messages,
  inputText,
  messagesEndRef,
  sessionTitle,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  onCreateShare,
}: BrainstormLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={40} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-20" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <header className={cn(
        'sticky top-0 z-20 shrink-0 border-b border-white/[0.04]',
        'bg-stone-950/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl',
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-[0_12px_32px_rgba(249,115,22,0.25)]">
                <Sparkles className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <AnimatedGradientText colorFrom="#f97316" colorTo="#fb923c" className="text-xs font-semibold uppercase tracking-[0.24em]">
                  Creative Spark
                </AnimatedGradientText>
                <h1 className="truncate text-lg font-semibold text-white">Inspiration mode</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Talk to spark ideas — images &amp; video will appear here.
            </p>
          </div>
          <StatusChip isConnected={isConnected} isStarting={isStarting} />
        </div>
      </header>

      {/* Gallery placeholder — milestone 2 will add masonry grid here */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8" data-testid="creative-spark-gallery-area">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10">
            <Sparkles className="h-8 w-8 text-orange-400" />
          </div>
          <div className="max-w-xs space-y-2">
            <h2 className="text-xl font-bold text-white">Creative Spark</h2>
            <p className="text-sm leading-relaxed text-stone-400">
              Start talking — images &amp; video will appear here.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Conversation + controls at the bottom */}
      <div className="relative z-20 flex flex-col overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/[0.05] bg-stone-950/60 shadow-[0_20px_60px_rgba(12,10,9,0.4)] max-h-[40vh]">
          <ConversationPanel
            messages={messages}
            messagesEndRef={messagesEndRef}
            mobile
            sessionTitle={sessionTitle}
            onCreateShare={onCreateShare}
          />
        </section>

        <section className="mt-4 shrink-0 rounded-3xl border border-white/[0.05] bg-stone-900/40 p-4 shadow-[0_20px_60px_rgba(12,10,9,0.4)]">
          <CreativeSparkControls
            isConnected={isConnected}
            isStarting={isStarting}
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
            handleConnect={handleConnect}
            stop={stop}
            layout="mobile"
          />
        </section>
      </div>
    </main>
  )
}
