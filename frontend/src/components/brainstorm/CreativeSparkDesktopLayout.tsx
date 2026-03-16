import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, RefreshCw, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { AgentVisualizer } from './AgentVisualizer'
import { MasonryGallery } from './MasonryGallery'
import { CreativeSparkControls } from './CreativeSparkControls'
import { DraggableWindow } from './DraggableWindow'
import { VoiceSelector } from './VoiceSelector'
import { DropDownSign } from './DropDownSign'

type WindowId = 'visualizer' | 'output' | 'conversation'

const DESKTOP_WINDOW_PADDING = 24
const DESKTOP_WINDOW_GAP = 16
const DESKTOP_CONTROLS_RESERVE = 116

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
  inputText,
  messagesEndRef,
  sessionTitle,
  selectedVoice,
  setSelectedVoice,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  isMuted,
  toggleMute,
  downloadArtifact,
  downloadAllArtifacts,
  onCreateShare,
  autoStartError,
  clearAutoStartError,
  onGoBack,
}: BrainstormLayoutProps) {
  const [maxZ, setMaxZ] = useState(10)
  const [layoutKey, setLayoutKey] = useState(0)

  const getInitialWindows = useCallback((): Record<WindowId, WindowState> => {
    const isClient = typeof window !== 'undefined'
    const iw = isClient ? window.innerWidth : 1024
    const ih = isClient ? window.innerHeight : 768

    const pad = DESKTOP_WINDOW_PADDING
    const gap = DESKTOP_WINDOW_GAP
    const usableW = iw - pad * 2
    const usableH = ih - pad * 2 - DESKTOP_CONTROLS_RESERVE

    // Left column ~48%, right column ~48%, gap in between
    const leftW = Math.round((usableW - gap) * 0.48)
    const rightW = usableW - leftW - gap

    const titleBar = 36
    const vizContentH = Math.round(leftW * (1536 / 2754))
    const vizH = Math.min(
      vizContentH + titleBar,
      Math.round(usableH * 0.55),
    )
    const bottomH = usableH - vizH - gap

    return {
      visualizer: {
        id: 'visualizer',
        title: 'Agent Visualizer',
        isMinimized: false,
        isMaximized: false,
        zIndex: 3,
        defaultState: { x: pad, y: pad, w: leftW, h: vizH },
      },
      output: {
        id: 'output',
        title: 'Output Exploration',
        isMinimized: false,
        isMaximized: false,
        zIndex: 1,
        defaultState: { x: pad, y: pad + vizH + gap, w: leftW, h: bottomH },
      },
      conversation: {
        id: 'conversation',
        title: 'Conversation History',
        isMinimized: false,
        isMaximized: false,
        zIndex: 2,
        defaultState: { x: pad + leftW + gap, y: pad, w: rightW, h: usableH },
      },
    }
  }, [])

  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(() => getInitialWindows())
  const [showSign, setShowSign] = useState(true)
  const windowBoundsInset = {
    top: DESKTOP_WINDOW_PADDING,
    right: DESKTOP_WINDOW_PADDING,
    bottom: DESKTOP_WINDOW_PADDING + DESKTOP_CONTROLS_RESERVE,
    left: DESKTOP_WINDOW_PADDING,
  }

  const resetLayout = useCallback(() => {
    setWindows(getInitialWindows())
    setLayoutKey(k => k + 1)
  }, [getInitialWindows])

  useEffect(() => {
    let timeoutId: number | null = null

    const handleResize = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        resetLayout()
      }, 150)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [resetLayout])

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
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#3b82f6" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <DropDownSign show={showSign} onComplete={() => setShowSign(false)} />

      {/* Minimized Dock */}
      <div className="absolute bottom-32 left-4 z-[100] flex flex-col-reverse gap-2">
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
            boundsInset={windowBoundsInset}
          >
            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-black/20 p-1">
              <AgentVisualizer
                intensityRef={intensityRef}
                isGenerating={isGenerating}
                isConnected={isConnected}
                className="w-full rounded-xl overflow-hidden"
              />
            </div>
          </DraggableWindow>

          <section
            className="absolute flex overflow-hidden rounded-2xl border border-blue-600/40 bg-black/80 shadow-[0_0_20px_rgba(37,99,235,0.25)] backdrop-blur-2xl"
            style={{
              left: windows.output.defaultState.x,
              top: windows.output.defaultState.y,
              width: windows.output.defaultState.w,
              height: windows.output.defaultState.h,
              zIndex: windows.output.zIndex,
            }}
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex h-10 shrink-0 items-center justify-between bg-white/[0.03] px-3">
                <div className="w-8" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold tracking-widest text-stone-400 uppercase font-mono">
                    {windows.output.title}
                  </span>
                </div>
                <div className="w-8" />
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
                <Particles className="absolute inset-0 z-0 opacity-40" quantity={120} ease={80} color="#3b82f6" refresh />
                <DotPattern className="absolute inset-0 z-0 opacity-50" width={32} height={32} cx={16} cy={16} cr={1} />
                <div className="relative z-10 flex-1 min-h-0">
                  <MasonryGallery
                    artifactList={artifactList}
                    isGenerating={isGenerating}
                    downloadArtifact={downloadArtifact}
                    downloadAllArtifacts={downloadAllArtifacts}
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            className="absolute flex overflow-hidden rounded-2xl border border-blue-600/40 bg-black/80 shadow-[0_0_20px_rgba(37,99,235,0.25)] backdrop-blur-2xl"
            style={{
              left: windows.conversation.defaultState.x,
              top: windows.conversation.defaultState.y,
              width: windows.conversation.defaultState.w,
              height: windows.conversation.defaultState.h,
              zIndex: windows.conversation.zIndex,
            }}
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex h-10 shrink-0 items-center justify-between bg-white/[0.03] px-3">
                <div className="w-8" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold tracking-widest text-stone-400 uppercase font-mono">
                    {windows.conversation.title}
                  </span>
                </div>
                <div className="w-8" />
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
              <ConversationPanel
                messages={messages}
                toolActivityEntries={toolActivityEntries}
                messagesEndRef={messagesEndRef}
                mobile={false}
                transcriptBottomInset={DESKTOP_CONTROLS_RESERVE}
                sessionTitle={sessionTitle}
                isConnected={isConnected}
                isStarting={isStarting}
                isMuted={isMuted}
                handleConnect={handleConnect}
                stop={stop}
                toggleMute={toggleMute}
                headerExtra={
                  <VoiceSelector
                    selectedVoice={selectedVoice}
                    setSelectedVoice={setSelectedVoice}
                    disabled={isConnected || isStarting}
                    compact
                  />
                }
              />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[120] flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-3xl">
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
            layout="desktop"
            onResetLayout={resetLayout}
            onCreateShare={onCreateShare}
            onGoBack={onGoBack}
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
                  className="flex-1 gap-2 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 py-3 text-sm font-bold text-stone-950 shadow-lg hover:from-orange-400 hover:to-blue-600"
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


