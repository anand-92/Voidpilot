import { Separator } from '@/components/ui/separator'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import { IconBrainstorm } from '../icons/CustomIcons'
import { StatusChip } from '../SharedUI'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { BrainstormControls } from './BrainstormControls'
import { ConversationPanel } from './ConversationPanel'
import { WorkspacePanel } from './WorkspacePanel'
import { AgentVisualizer } from './AgentVisualizer'

export function BrainstormDesktopLayout({
  intensityRef,
  isConnected,
  isStarting,
  messages,
  artifacts,
  artifactList,
  totalSize,
  isGenerating,
  inputText,
  selectedArtifact,
  currentArtifact,
  selectedFlashModel,
  setSelectedFlashModel,
  messagesEndRef,
  setInputText,
  setSelectedArtifact,
  handleSend,
  handleConnect,
  stop,
}: BrainstormLayoutProps) {
  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-40" quantity={120} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-50" width={32} height={32} cx={16} cy={16} cr={1} />

      {/* Floating Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4 rounded-[2rem] border border-white/[0.08] bg-black/50 px-5 py-3 backdrop-blur-2xl shadow-xl">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-inner">
          <IconBrainstorm className="size-4 text-white" />
        </div>
        <AnimatedGradientText colorFrom="#d97706" colorTo="#fbbf24" className="text-base font-bold tracking-tight">
          Brainstorm
        </AnimatedGradientText>
        <Separator orientation="vertical" className="h-5 bg-white/20" />
        <StatusChip isConnected={isConnected} isStarting={isStarting} />
      </header>

      {/* Main spatial area: Workspace */}
      <div className="absolute inset-0 z-10 pt-28 pb-6 pl-8 pr-[420px] flex flex-col overflow-hidden">
        <AgentVisualizer intensityRef={intensityRef} isGenerating={isGenerating} isConnected={isConnected} />
        <WorkspacePanel
          artifacts={artifacts}
          artifactList={artifactList}
          totalSize={totalSize}
          isGenerating={isGenerating}
          selectedArtifact={selectedArtifact}
          currentArtifact={currentArtifact}
          setSelectedArtifact={setSelectedArtifact}
          mobile={false}
        />
      </div>

      {/* Floating Chat Side Panel */}
      <div className="absolute top-6 right-6 bottom-[220px] w-[380px] z-40 flex flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/60 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {isConnected && <BorderBeam size={100} duration={10} colorFrom="#d97706" colorTo="#b45309" />}
        <ConversationPanel messages={messages} messagesEndRef={messagesEndRef} mobile={false} />
      </div>

      {/* Floating Command Bar at bottom */}
      <div className="absolute bottom-6 right-6 w-[380px] z-50 flex flex-col justify-end">
        <BrainstormControls
          isConnected={isConnected}
          isStarting={isStarting}
          selectedFlashModel={selectedFlashModel}
          setSelectedFlashModel={setSelectedFlashModel}
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
