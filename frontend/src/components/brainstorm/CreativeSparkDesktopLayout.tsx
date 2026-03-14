import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, MessageSquareText, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import { cn } from '@/lib/utils'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { AgentVisualizer } from './AgentVisualizer'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'
import { MasonryGallery } from './MasonryGallery'

const PANEL_WIDTH = 400

/**
 * Desktop layout for Creative Spark mode.
 *
 * Full-screen masonry gallery with a **collapsible** conversation panel
 * that slides in from the right. The panel is hidden by default — a
 * toggle button is always visible to reveal/hide it.
 *
 * Persistent controls (mic, connect/disconnect, text input) are fixed
 * at the bottom of the screen and never scroll with the gallery.
 *
 * Includes AgentVisualizer above the gallery. Excludes Open Studio
 * elements (WorkspacePanel, tool toggles, model selector).
 */
export function CreativeSparkDesktopLayout({
  intensityRef,
  isConnected,
  isStarting,
  messages,
  artifactList,
  isGenerating,
  inputText,
  messagesEndRef,
  sessionTitle,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  downloadArtifact,
  downloadAllArtifacts,
  onCreateShare,
  autoStartError,
  clearAutoStartError,
  onGoBack,
}: BrainstormLayoutProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      {/* Full-screen masonry gallery + agent visualizer */}
      <div
        className="relative z-10 flex flex-1 flex-col overflow-hidden pb-[140px]"
        data-testid="creative-spark-gallery-area"
      >
        <div className="shrink-0 px-6 pt-4">
          <AgentVisualizer
            intensityRef={intensityRef}
            isGenerating={isGenerating}
            isConnected={isConnected}
            className="relative w-full rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden"
          />
        </div>
        <MasonryGallery
          artifactList={artifactList}
          isGenerating={isGenerating}
          downloadArtifact={downloadArtifact}
          downloadAllArtifacts={downloadAllArtifacts}
        />
      </div>

      {/* Conversation panel toggle button */}
      <button
        type="button"
        onClick={() => setIsPanelOpen((v) => !v)}
        aria-label={isPanelOpen ? 'Hide conversation' : 'Show conversation'}
        data-testid="conversation-panel-toggle"
        className={cn(
          'fixed z-50 flex items-center justify-center rounded-2xl border border-white/[0.08] shadow-lg backdrop-blur-xl transition-all duration-300',
          'hover:scale-105 hover:border-orange-500/30 hover:shadow-orange-500/10',
          isPanelOpen
            ? 'right-[416px] top-5 size-10 bg-white/[0.06]'
            : 'right-5 top-5 gap-2 bg-orange-500/10 px-4 py-2.5',
        )}
      >
        {isPanelOpen ? (
          <X className="size-4 text-stone-400" />
        ) : (
          <>
            <MessageSquareText className="size-4 text-orange-400" />
            {messages.length > 0 && (
              <span className="text-xs font-medium text-orange-300">
                {messages.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Collapsible conversation panel — slides in from right */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: PANEL_WIDTH + 16 }}
            animate={{ x: 0 }}
            exit={{ x: PANEL_WIDTH + 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-40 flex h-full flex-col overflow-hidden border-l border-white/[0.08] bg-black/70 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            style={{ width: PANEL_WIDTH }}
            data-testid="conversation-panel"
          >
            <ConversationPanel
              messages={messages}
              messagesEndRef={messagesEndRef}
              mobile={false}
              sessionTitle={sessionTitle}
              onCreateShare={onCreateShare}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent controls — fixed at bottom, always visible */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-2xl"
        data-testid="persistent-controls"
      >
        <div className="mx-auto max-w-2xl px-6 py-4">
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
      </div>

      {/* Auto-start error recovery overlay */}
      <AnimatePresence>
        {autoStartError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
            data-testid="auto-start-error-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mx-4 flex max-w-md flex-col items-center gap-6 rounded-3xl border border-white/[0.08] bg-stone-950/90 p-8 text-center shadow-2xl backdrop-blur-3xl"
            >
              <div className="flex size-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.08]">
                <AlertCircle className="size-8 text-rose-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  Couldn't Start Creative Spark
                </h3>
                <p className="text-sm leading-relaxed text-stone-400">
                  The model failed to start speaking. This could be a temporary issue — try again or go back to choose a different mode.
                </p>
              </div>
              <div className="flex w-full gap-3">
                {onGoBack && (
                  <Button
                    variant="outline"
                    onClick={onGoBack}
                    className="flex-1 gap-2 rounded-2xl border-white/[0.08] bg-white/[0.04] py-3 text-sm font-medium text-stone-300 hover:bg-white/[0.08]"
                  >
                    <ArrowLeft className="size-4" />
                    Go Back
                  </Button>
                )}
                <Button
                  onClick={() => {
                    clearAutoStartError?.()
                    void handleConnect()
                  }}
                  className="flex-1 gap-2 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 py-3 text-sm font-bold text-stone-950 shadow-lg hover:from-orange-400 hover:to-red-500"
                >
                  <RefreshCw className="size-4" />
                  Try Again
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
