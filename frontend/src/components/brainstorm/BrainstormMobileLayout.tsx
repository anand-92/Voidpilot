import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Link as LinkIcon, MessageSquareText, MoreVertical, Share2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { Button } from '@/components/ui/button'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusChip } from '../SharedUI'
import { IconBrainstorm } from '../icons/CustomIcons'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'
import { FloatingAgentWindow } from './FloatingAgentWindow'
import { WorkspacePanel } from './WorkspacePanel'
import { DropDownSign } from './DropDownSign'

export function BrainstormMobileLayout({
  intensityRef,
  isConnected,
  isStarting,
  messages,
  toolActivityEntries,
  artifactList,
  totalSize,
  isGenerating,
  inputText,
  selectedArtifact,
  currentArtifact,
  selectedArtifactLoadState,
  sessionTitle,
  selectedVoice,
  setSelectedVoice,
  selectedTools,
  setSelectedTools,
  messagesEndRef,
  setInputText,
  setSelectedArtifact,
  downloadArtifact,
  downloadAllArtifacts,
  handleSend,
  handleConnect,
  stop,
  isMuted,
  toggleMute,
  onCreateShare,
  onGoBack,
}: BrainstormLayoutProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showSign, setShowSign] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareMessage, setShareMessage] = useState('')

  useEffect(() => {
    if (artifactList.length > 0) {
      setSelectedArtifact((previousSelectedArtifact) => previousSelectedArtifact ?? artifactList[0][0])
    }
  }, [artifactList, setSelectedArtifact])

  const handleShare = async () => {
    if (!onCreateShare || shareState === 'loading') {
      return
    }

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
  }

  return (
    <main className="relative flex h-dvh flex-col bg-[#0a0a0a] font-sans text-stone-100">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={40} ease={100} color="#3b82f6" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-20" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <DropDownSign show={showSign} onComplete={() => setShowSign(false)} />

      <header className={cn(
        'sticky top-0 z-20 shrink-0 border-b border-white/[0.04]',
        'bg-stone-950/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_12px_32px_rgba(59,130,246,0.25)]">
              <IconBrainstorm className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <AnimatedGradientText colorFrom="#3b82f6" colorTo="#60a5fa" className="text-[10px] font-semibold uppercase tracking-[0.24em]">
                Open Studio
              </AnimatedGradientText>
              <h1 className="truncate text-sm font-semibold text-white">Workspace mode</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => setMobileMenuOpen((currentOpen) => !currentOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl transition-colors active:bg-white/[0.08]"
            >
              {mobileMenuOpen ? <X className="size-4 text-stone-300" /> : <MoreVertical className="size-4 text-stone-300" />}
            </button>
          </div>
        </div>

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
                    className="h-9 gap-2 rounded-xl px-3 text-sm text-stone-300 hover:bg-white/[0.08] hover:text-white"
                  >
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
                    className="h-9 gap-2 rounded-xl px-3 text-sm text-stone-300 hover:bg-white/[0.08] hover:text-white"
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

      <FloatingAgentWindow
        intensityRef={intensityRef}
        isGenerating={isGenerating}
        isConnected={isConnected}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
        <WorkspacePanel
          artifactList={artifactList}
          totalSize={totalSize}
          isGenerating={isGenerating}
          selectedArtifact={selectedArtifact}
          currentArtifact={currentArtifact}
          selectedArtifactLoadState={selectedArtifactLoadState}
          setSelectedArtifact={setSelectedArtifact}
          downloadArtifact={downloadArtifact}
          downloadAllArtifacts={downloadAllArtifacts}
          mobile
        />
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        data-testid="persistent-controls"
      >
        <div className="pointer-events-auto w-full max-w-lg px-4 pb-2">
          <CreativeSparkControls
            isConnected={isConnected}
            isStarting={isStarting}
            isToolRunning={isGenerating}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            selectedTools={selectedTools}
            setSelectedTools={setSelectedTools}
            showToolSelector
            startLabel="Start Studio"
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
            handleConnect={handleConnect}
            stop={stop}
            layout="mobile"
          />
        </div>
      </div>

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

            <div className="shrink-0 border-t border-white/[0.06] bg-stone-950/80 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
              <CreativeSparkControls
                isConnected={isConnected}
                isStarting={isStarting}
                isToolRunning={isGenerating}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                selectedTools={selectedTools}
                setSelectedTools={setSelectedTools}
                showToolSelector
                startLabel="Start Studio"
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

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="border-white/[0.08] bg-stone-950/95 text-white backdrop-blur-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share copied</DialogTitle>
            <DialogDescription className="text-stone-400">
              Your share message is ready to paste.
            </DialogDescription>
          </DialogHeader>
          <Input value={shareMessage} readOnly className="border-white/[0.08] bg-white/[0.04] text-white" />
        </DialogContent>
      </Dialog>
    </main>
  )
}
