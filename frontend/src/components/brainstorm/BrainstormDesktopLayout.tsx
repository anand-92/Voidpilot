import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { BrainstormControls } from './BrainstormControls'
import { ConversationPanel } from './ConversationPanel'
import { WorkspacePanel } from './WorkspacePanel'
import { AgentVisualizer } from './AgentVisualizer'
import { DraggableWindow } from './DraggableWindow'
import { SparkToolbar } from './SparkToolbar'
import { VoiceSelector } from './VoiceSelector'
import { DropDownSign } from './DropDownSign'

type WindowId = 'visualizer' | 'workspace' | 'conversation'

interface WindowState {
  id: WindowId
  title: string
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  defaultState: { x: number; y: number; w: number | string; h: number | string }
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
  selectedFlashModel,
  setSelectedFlashModel,
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
  onCreateShare,
  onGoBack,
}: BrainstormLayoutProps) {
  const [maxZ, setMaxZ] = useState(10)
  const [layoutKey, setLayoutKey] = useState(0)

  const getInitialWindows = (): Record<WindowId, WindowState> => {
    const isClient = typeof window !== 'undefined'
    const iw = isClient ? window.innerWidth : 1024
    const ih = isClient ? window.innerHeight : 768

    const pad = 24
    const gap = 16
    const usableW = iw - pad * 2
    const usableH = ih - pad * 2

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
      workspace: {
        id: 'workspace',
        title: 'Workspace',
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
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans" id="studio-layout-container">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#3b82f6" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <DropDownSign show={showSign} onComplete={() => setShowSign(false)} />

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
          {/* Agent Visualizer */}
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
          >
            <div className="w-full h-full overflow-hidden flex items-center justify-center bg-black/20 p-1">
              <AgentVisualizer
                intensityRef={intensityRef}
                isGenerating={isGenerating}
                isConnected={isConnected}
                className="w-full rounded-xl overflow-hidden"
              />
            </div>
          </DraggableWindow>

          {/* Workspace */}
          <DraggableWindow
            key={`workspace-${layoutKey}`}
            title={windows.workspace.title}
            defaultState={windows.workspace.defaultState}
            isMinimized={windows.workspace.isMinimized}
            isMaximized={windows.workspace.isMaximized}
            onMinimize={() => toggleMinimize('workspace')}
            onMaximize={() => toggleMaximize('workspace')}
            onRestore={() => toggleMaximize('workspace')}
            zIndex={windows.workspace.zIndex}
            onFocus={() => bringToFront('workspace')}
          >
            <div className="w-full h-full overflow-hidden flex flex-col bg-black/40">
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
          </DraggableWindow>

          {/* Conversation + Controls */}
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
          >
            <div className="w-full h-full overflow-hidden flex flex-col bg-black">
              <ConversationPanel
                messages={messages}
                toolActivityEntries={toolActivityEntries}
                messagesEndRef={messagesEndRef}
                mobile={false}
                sessionTitle={sessionTitle}
                onCreateShare={onCreateShare}
                headerExtra={
                  <VoiceSelector
                    selectedVoice={selectedVoice}
                    setSelectedVoice={setSelectedVoice}
                    disabled={isConnected || isStarting}
                    compact
                  />
                }
              />
              <BrainstormControls
                isConnected={isConnected}
                isStarting={isStarting}
                isToolRunning={isGenerating}
                selectedFlashModel={selectedFlashModel}
                setSelectedFlashModel={setSelectedFlashModel}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                selectedTools={selectedTools}
                setSelectedTools={setSelectedTools}
                inputText={inputText}
                setInputText={setInputText}
                handleSend={handleSend}
                handleConnect={handleConnect}
                stop={stop}
                layout="desktop"
              />
            </div>
          </DraggableWindow>
        </div>
      </div>
    </main>
  )
}
