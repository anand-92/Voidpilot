import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { WorkspacePanel } from './WorkspacePanel'
import { AgentVisualizer } from './AgentVisualizer'
import { DraggableWindow } from './DraggableWindow'
import { VoiceSelector } from './VoiceSelector'
import { DropDownSign } from './DropDownSign'
import { CreativeSparkControls } from './CreativeSparkControls'

type WindowId = 'visualizer' | 'output' | 'conversation'

const DESKTOP_WINDOW_PADDING = 24
const DESKTOP_WINDOW_GAP = 16
const DESKTOP_CONTROLS_RESERVE = 160

interface WindowState {
  id: WindowId
  title: string
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  defaultState: { x: number; y: number; w: number | string; h: number | string }
}

function getInitialStudioWindows(): Record<WindowId, WindowState> {
  const isClient = typeof window !== 'undefined'
  const iw = isClient ? window.innerWidth : 1024
  const ih = isClient ? window.innerHeight : 768

  const pad = DESKTOP_WINDOW_PADDING
  const gap = DESKTOP_WINDOW_GAP
  const usableW = iw - pad * 2
  const usableH = ih - pad * 2 - DESKTOP_CONTROLS_RESERVE

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
}

export function BrainstormDesktopLayout({
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
  const [maxZ, setMaxZ] = useState(10)
  const [layoutKey, setLayoutKey] = useState(0)

  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(() => getInitialStudioWindows())
  const [showSign, setShowSign] = useState(true)
  const windowBoundsInset = {
    top: DESKTOP_WINDOW_PADDING,
    right: DESKTOP_WINDOW_PADDING,
    bottom: DESKTOP_WINDOW_PADDING + DESKTOP_CONTROLS_RESERVE,
    left: DESKTOP_WINDOW_PADDING,
  }

  const resetLayout = () => {
    setWindows(getInitialStudioWindows())
    setLayoutKey((currentKey) => currentKey + 1)
  }

  useEffect(() => {
    let timeoutId: number | null = null

    const handleResize = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        setWindows(getInitialStudioWindows())
        setLayoutKey((currentKey) => currentKey + 1)
      }, 150)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const bringToFront = (id: WindowId) => {
    setMaxZ((previousMaxZ) => previousMaxZ + 1)
    setWindows((previousWindows) => ({
      ...previousWindows,
      [id]: { ...previousWindows[id], zIndex: maxZ + 1 },
    }))
  }

  const toggleMinimize = (id: WindowId) => {
    setWindows((previousWindows) => ({
      ...previousWindows,
      [id]: {
        ...previousWindows[id],
        isMinimized: !previousWindows[id].isMinimized,
        isMaximized: false,
      },
    }))
  }

  const toggleMaximize = (id: WindowId) => {
    bringToFront(id)
    setWindows((previousWindows) => ({
      ...previousWindows,
      [id]: {
        ...previousWindows[id],
        isMaximized: !previousWindows[id].isMaximized,
        isMinimized: false,
      },
    }))
  }

  const minimizedWindows = Object.values(windows).filter((windowState) => windowState.isMinimized)

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] font-sans text-stone-100" id="studio-layout-container">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#3b82f6" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <DropDownSign show={showSign} onComplete={() => setShowSign(false)} />

      <div className="absolute bottom-40 left-4 z-[100] flex flex-col-reverse gap-2">
        <AnimatePresence>
          {minimizedWindows.map((windowState) => (
            <motion.div
              key={windowState.id}
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.8 }}
            >
              <Button
                variant="outline"
                onClick={() => toggleMinimize(windowState.id)}
                className="h-10 gap-2 rounded-xl border-white/[0.08] bg-black/80 px-4 text-stone-300 shadow-2xl backdrop-blur-xl hover:border-orange-500/30 hover:bg-white/[0.1]"
              >
                <Maximize2 className="size-3.5 text-orange-400" />
                <span className="text-xs font-mono tracking-wider">{windowState.title}</span>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
                className="w-full overflow-hidden rounded-xl"
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
              <div className="relative flex shrink-0 items-center justify-between bg-white/[0.03] px-3 py-2">
                <div className="w-8" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                    {windows.output.title}
                  </span>
                </div>
                <div className="w-8" />
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a] p-4">
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
                  mobile={false}
                />
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
              <div className="relative flex shrink-0 items-center justify-between bg-white/[0.03] px-3 py-2">
                <div className="w-8" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
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
                  onCreateShare={onCreateShare}
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
        <div className="pointer-events-auto w-full max-w-4xl">
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
            layout="desktop"
            onResetLayout={resetLayout}
            onCreateShare={onCreateShare}
            onGoBack={onGoBack}
          />
        </div>
      </div>
    </main>
  )
}
