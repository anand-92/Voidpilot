import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, RefreshCw, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { AgentVisualizer } from './AgentVisualizer'
import { MasonryGallery } from './MasonryGallery'
import { DraggableWindow } from './DraggableWindow'
import { SparkToolbar } from './SparkToolbar'
import { VoiceSelector } from './VoiceSelector'
import { DropDownSign } from './DropDownSign'

type WindowId = 'visualizer' | 'output' | 'conversation'

interface WindowState {
  id: WindowId
  title: string
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  defaultState: { x: number; y: number; w: number | string; h: number | string }
}

export function CreativeSparkDesktopLayout({
  intensityRef,
  isConnected,
  isStarting,
  messages,
  toolActivityEntries,
  artifactList,
  isGenerating,
  messagesEndRef,
  sessionTitle,
  selectedVoice,
  setSelectedVoice,
  handleConnect,
  stop,
  isMicPaused,
  toggleMicPause,
  downloadArtifact,
  downloadAllArtifacts,
  onCreateShare,
  autoStartError,
  clearAutoStartError,
  onGoBack,
}: BrainstormLayoutProps) {
  const [maxZ, setMaxZ] = useState(10)
  const [layoutKey, setLayoutKey] = useState(0)

  const getInitialWindows = (): Record<WindowId, WindowState> => {
    const isClient = typeof window !== 'undefined'
    const iw = isClient ? window.innerWidth : 1024
    const ih = isClient ? window.innerHeight : 768

    // The output container takes up half of the page in width
    const rightWidth = Math.round(iw * 0.5)
    const leftWidth = iw - rightWidth
    
    const outputWidth = rightWidth
    const outputHeight = ih

    // Agent visualizer aspect ratio is 2754/1536 ≈ 1.793
    // We calculate height to exactly preserve this ratio without being cut off
    const visualizerWidth = leftWidth
    const visualizerHeight = Math.round(visualizerWidth * (1536 / 2754))
    
    // Conversation takes the remaining height on the left
    const conversationWidth = leftWidth
    const conversationHeight = ih - visualizerHeight

    return {
      visualizer: {
        id: 'visualizer',
        title: 'Agent Visualizer',
        isMinimized: false,
        isMaximized: false,
        zIndex: 3,
        defaultState: { x: 0, y: 0, w: visualizerWidth, h: visualizerHeight }
      },
      output: {
        id: 'output',
        title: 'Output Exploration',
        isMinimized: false,
        isMaximized: false,
        zIndex: 1,
        // Positioned on the right
        defaultState: { x: leftWidth, y: 0, w: outputWidth, h: outputHeight }
      },
      conversation: {
        id: 'conversation',
        title: 'Conversation History',
        isMinimized: false,
        isMaximized: false,
        zIndex: 2,
        // Positioned on the bottom left
        defaultState: { x: 0, y: visualizerHeight, w: conversationWidth, h: conversationHeight }
      }
    }
  }

  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(getInitialWindows)
  const [showSign, setShowSign] = useState(true)

  const resetLayout = () => {
    setWindows(getInitialWindows())
    setLayoutKey(k => k + 1)
  }

  const bringToFront = (id: WindowId) => {
    setMaxZ(prev => prev + 1)
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], zIndex: maxZ + 1 }
    }))
  }

  const toggleMinimize = (id: WindowId) => {
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], isMinimized: !prev[id].isMinimized, isMaximized: false }
    }))
  }

  const toggleMaximize = (id: WindowId) => {
    bringToFront(id)
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], isMaximized: !prev[id].isMaximized, isMinimized: false }
    }))
  }

  const minimizedWindows = Object.values(windows).filter(w => w.isMinimized)

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans" id="layout-container">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <DropDownSign show={showSign} onComplete={() => setShowSign(false)} />

      {/* Top Left Toolbar: Back, Reset Layout, Help */}
      <SparkToolbar onGoBack={onGoBack} onResetLayout={resetLayout} />

      {/* Minimized Dock */}
      <div className="absolute bottom-24 left-4 z-[100] flex flex-col-reverse gap-2">
        <AnimatePresence>
          {minimizedWindows.map(w => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.8 }}
            >
              <Button
                variant="outline"
                onClick={() => toggleMinimize(w.id)}
                className="gap-2 rounded-xl border-white/[0.08] bg-black/80 backdrop-blur-xl text-stone-300 hover:bg-white/[0.1] hover:border-orange-500/30 shadow-2xl h-10 px-4"
              >
                <Maximize2 className="size-3.5 text-orange-400" />
                <span className="text-xs font-mono tracking-wider">{w.title}</span>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Draggable Windows */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <DraggableWindow
            key={`visualizer-${layoutKey}`}
            title={windows.visualizer.title}
            defaultState={windows.visualizer.defaultState}
            isMinimized={windows.visualizer.isMinimized}
            isMaximized={windows.visualizer.isMaximized}
            onMinimize={() => toggleMinimize('visualizer')}
            onMaximize={() => toggleMaximize('visualizer')}
            onRestore={() => toggleMaximize('visualizer')}
            zIndex={windows.visualizer.zIndex}
            onFocus={() => bringToFront('visualizer')}
            bounds="#layout-container"
          >
            <div className="w-full h-full p-1 bg-black/20">
              <AgentVisualizer
                intensityRef={intensityRef}
                isGenerating={isGenerating}
                isConnected={isConnected}
                className="w-full h-full rounded-xl object-cover"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </DraggableWindow>

          <DraggableWindow
            key={`output-${layoutKey}`}
            title={windows.output.title}
            defaultState={windows.output.defaultState}
            isMinimized={windows.output.isMinimized}
            isMaximized={windows.output.isMaximized}
            onMinimize={() => toggleMinimize('output')}
            onMaximize={() => toggleMaximize('output')}
            onRestore={() => toggleMaximize('output')}
            zIndex={windows.output.zIndex}
            onFocus={() => bringToFront('output')}
            bounds="#layout-container"
          >
            <div className="w-full h-full overflow-hidden flex flex-col bg-black/40">
              <MasonryGallery
                artifactList={artifactList}
                isGenerating={isGenerating}
                downloadArtifact={downloadArtifact}
                downloadAllArtifacts={downloadAllArtifacts}
              />
            </div>
          </DraggableWindow>

          <DraggableWindow
            key={`conversation-${layoutKey}`}
            title={windows.conversation.title}
            defaultState={windows.conversation.defaultState}
            isMinimized={windows.conversation.isMinimized}
            isMaximized={windows.conversation.isMaximized}
            onMinimize={() => toggleMinimize('conversation')}
            onMaximize={() => toggleMaximize('conversation')}
            onRestore={() => toggleMaximize('conversation')}
            zIndex={windows.conversation.zIndex}
            onFocus={() => bringToFront('conversation')}
            bounds="#layout-container"
          >
            <div className="w-full h-full overflow-hidden flex flex-col bg-black">
              <div className="border-b border-white/[0.06] bg-stone-950/80 px-3 py-2 backdrop-blur-xl">
                <div className="max-w-sm">
                  <VoiceSelector
                    selectedVoice={selectedVoice}
                    setSelectedVoice={setSelectedVoice}
                    disabled={isConnected || isStarting}
                    compact
                  />
                </div>
              </div>
              <ConversationPanel
                messages={messages}
                toolActivityEntries={toolActivityEntries}
                messagesEndRef={messagesEndRef}
                mobile={false}
                sessionTitle={sessionTitle}
                onCreateShare={onCreateShare}
                isConnected={isConnected}
                isStarting={isStarting}
                isMicPaused={isMicPaused}
                handleConnect={handleConnect}
                stop={stop}
                toggleMicPause={toggleMicPause}
              />
            </div>
          </DraggableWindow>
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
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
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


