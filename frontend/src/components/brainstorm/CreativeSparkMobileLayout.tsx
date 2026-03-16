import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, Check, Link as LinkIcon, MessageSquareText, MoreVertical, RefreshCw, Share2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { Button } from '@/components/ui/button'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Badge } from '@/components/ui/badge'
import { StatusChip } from '../SharedUI'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'
import { FloatingAgentWindow } from './FloatingAgentWindow'
import { MasonryGallery } from './MasonryGallery'
import { DropDownSign } from './DropDownSign'

/**
 * Mobile layout for Creative Spark mode.
 *
 * Full-screen masonry gallery with persistent controls at the bottom.
 * Conversation panel opens as a **full-screen overlay** (not a side panel
 * which would make the gallery unusable on small screens).
 *
 * Touch-friendly: all interactive targets ≥ 44×44px.
 * Respects safe-area-inset-bottom for devices with notches/home indicators.
 *
 * AgentVisualizer renders as a floating draggable window. Excludes Open Studio
 * elements (WorkspacePanel, tool toggles, model selector).
 */
export function CreativeSparkMobileLayout({
  intensityRef,
  isConnected,
  isStarting,
  messages,
  toolActivityEntries,
  artifactList,
  isGenerating,
  inputText,
  messagesEndRef,
  sessionTitle,
  selectedVoice,
  setSelectedVoice,
  isMuted,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  toggleMute,
  downloadArtifact,
  downloadAllArtifacts,
  onCreateShare,
  autoStartError,
  clearAutoStartError,
  onGoBack,
}: BrainstormLayoutProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showSign, setShowSign] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')

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
    <main className="relative flex h-dvh flex-col bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={40} ease={100} color="#3b82f6" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-20" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <DropDownSign show={showSign} onComplete={() => setShowSign(false)} />

      {/* Header */}
      <header className={cn(
        'sticky top-0 z-20 shrink-0 border-b border-white/[0.04]',
        'bg-stone-950/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_12px_32px_rgba(59,130,246,0.25)]">
              <Sparkles className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <AnimatedGradientText colorFrom="#3b82f6" colorTo="#60a5fa" className="text-[10px] font-semibold uppercase tracking-[0.24em]">
                Creative Spark
              </AnimatedGradientText>
              <h1 className="truncate text-sm font-semibold text-white">Inspiration mode</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Conversation toggle button -- 44px touch target */}
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              aria-label="Show conversation"
              data-testid="conversation-panel-toggle"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-orange-500/10 px-3 backdrop-blur-xl transition-colors active:bg-orange-500/20"
            >
              <MessageSquareText className="size-4 text-orange-400" />
              {messages.length > 0 && (
                <Badge
                  variant="outline"
                  className="h-5 min-w-5 border-orange-500/30 bg-orange-500/15 px-1.5 text-[10px] font-bold text-orange-300"
                >
                  {messages.length}
                </Badge>
              )}
            </button>
            {/* Sub-menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl transition-colors active:bg-white/[0.08]"
            >
              {mobileMenuOpen ? <X className="size-4 text-stone-300" /> : <MoreVertical className="size-4 text-stone-300" />}
            </button>
          </div>
        </div>

        {/* Expandable sub-menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-2">
                {onGoBack && (
                  <Button
                    variant="ghost"
                    onClick={onGoBack}
                    className="gap-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/[0.08] text-sm h-9 px-3"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                )}
                {onCreateShare && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void handleShare()
                      setMobileMenuOpen(false)
                    }}
                    disabled={shareState === 'loading'}
                    className="gap-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/[0.08] text-sm h-9 px-3"
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
                <StatusChip isConnected={isConnected} isStarting={isStarting} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Floating agent visualizer window */}
      <FloatingAgentWindow
        intensityRef={intensityRef}
        isGenerating={isGenerating}
        isConnected={isConnected}
      />

      {/* Masonry gallery */}
      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
        data-testid="creative-spark-gallery-area"
      >
        <MasonryGallery
          artifactList={artifactList}
          isGenerating={isGenerating}
          downloadArtifact={downloadArtifact}
          downloadAllArtifacts={downloadAllArtifacts}
        />
      </div>

      {/* Floating controls — fixed at bottom */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        data-testid="persistent-controls"
      >
        <div className="pointer-events-auto w-full max-w-lg px-4 pb-2">
          <CreativeSparkControls
            isConnected={isConnected}
            isStarting={isStarting}
            isToolRunning={isGenerating}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
            handleConnect={handleConnect}
            stop={stop}
            layout="mobile"
          />
        </div>
      </div>

      {/* Full-screen conversation overlay */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]/95 backdrop-blur-3xl"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            data-testid="conversation-panel-overlay"
          >
            {/* Overlay header with close button */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-orange-400" />
                <span className="text-sm font-semibold text-white">
                  {sessionTitle ?? 'Conversation'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Close conversation"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors active:bg-white/[0.08]"
              >
                <X className="size-5 text-stone-400" />
              </button>
            </div>

            {/* Conversation content */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <ConversationPanel
                messages={messages}
                toolActivityEntries={toolActivityEntries}
                messagesEndRef={messagesEndRef}
                mobile
                sessionTitle={sessionTitle}
                isConnected={isConnected}
                isStarting={isStarting}
                isMuted={isMuted}
                handleConnect={handleConnect}
                stop={stop}
                toggleMute={toggleMute}
              />
            </div>

            {/* Inline controls at bottom of overlay */}
            <div className="shrink-0 border-t border-white/[0.06] bg-stone-950/80 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
              <CreativeSparkControls
                isConnected={isConnected}
                isStarting={isStarting}
                isToolRunning={isGenerating}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                inputText={inputText}
                setInputText={setInputText}
                handleSend={handleSend}
                handleConnect={handleConnect}
                stop={stop}
                layout="mobile"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-start error recovery overlay */}
      <AnimatePresence>
        {autoStartError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
            data-testid="auto-start-error-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/[0.08] bg-stone-950/90 p-6 text-center shadow-2xl backdrop-blur-3xl"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.08]">
                <AlertCircle className="size-7 text-rose-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">
                  Couldn't Start Creative Spark
                </h3>
                <p className="text-sm leading-relaxed text-stone-400">
                  The model failed to start. Try again or go back.
                </p>
              </div>
              <div className="flex w-full gap-3">
                {onGoBack && (
                  <Button
                    variant="outline"
                    onClick={onGoBack}
                    className="min-h-12 flex-1 gap-2 rounded-2xl border-white/[0.08] bg-white/[0.04] text-sm font-medium text-stone-300 hover:bg-white/[0.08]"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={() => {
                    clearAutoStartError?.()
                    void handleConnect()
                  }}
                  className="min-h-12 flex-1 gap-2 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-stone-950 shadow-lg hover:from-orange-400 hover:to-blue-600"
                >
                  <RefreshCw className="size-4" />
                  Retry
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
