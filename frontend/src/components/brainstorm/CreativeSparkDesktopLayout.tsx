import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'

/**
 * Desktop layout for Creative Spark mode.
 *
 * This is the placeholder layout that will be expanded in milestone 2
 * with a full masonry gallery. For now it renders a distinct Creative
 * Spark workspace with conversation panel and voice controls — but
 * explicitly excludes all Open Studio elements (AgentVisualizer,
 * WorkspacePanel, tool toggles, model selector).
 */
export function CreativeSparkDesktopLayout({
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
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      {/* Gallery area — placeholder for milestone 2 masonry gallery */}
      <div className="flex-1 z-10 flex flex-col items-center justify-center p-8" data-testid="creative-spark-gallery-area">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10">
            <Sparkles className="h-10 w-10 text-orange-400" />
          </div>
          <div className="max-w-md space-y-3">
            <h2 className="text-2xl font-bold text-white">Creative Spark</h2>
            <p className="text-sm leading-relaxed text-stone-400">
              Start talking — the AI will lead with questions, spin your answers into wild ideas, and generate images &amp; video right here.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right sidebar: conversation + voice controls */}
      <div className="w-[30%] min-w-[340px] max-w-[480px] shrink-0 z-40 flex flex-col overflow-hidden rounded-l-[2rem] border-l border-white/[0.08] bg-black/60 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative h-full">
        <ConversationPanel
          messages={messages}
          messagesEndRef={messagesEndRef}
          mobile={false}
          sessionTitle={sessionTitle}
          onCreateShare={onCreateShare}
        />

        <CreativeSparkControls
          isConnected={isConnected}
          isStarting={isStarting}
          inputText={inputText}
          setInputText={setInputText}
          handleSend={handleSend}
          handleConnect={handleConnect}
          stop={stop}
          layout="desktop"
        />
      </div>
    </main>
  )
}
