import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
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
  sessionTitle,
  selectedFlashModel,
  setSelectedFlashModel,
  selectedTools,
  setSelectedTools,
  messagesEndRef,
  setInputText,
  setSelectedArtifact,
  handleSend,
  handleConnect,
  stop,
}: BrainstormLayoutProps) {
  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans p-6 gap-6">
      <Particles className="absolute inset-0 z-0 opacity-40" quantity={120} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-50" width={32} height={32} cx={16} cy={16} cr={1} />

      {/* Left Pane (70%) */}
      <div className="flex-1 flex flex-col gap-6 w-[70%] z-40 h-full min-w-0">

        {/* Top: Agent Visualizer Window */}
        <div className="h-[55%] min-h-[300px] shrink-0 overflow-hidden relative">
          <AgentVisualizer
            intensityRef={intensityRef}
            isGenerating={isGenerating}
            isConnected={isConnected}
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Bottom: Workspace Panel */}
        <div className="flex-1 min-h-0 flex flex-col z-40 transition-all duration-500 relative">
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
      </div>

      {/* Right Sidebar (30%) */}
      <div className="w-[30%] min-w-[340px] max-w-[480px] shrink-0 z-40 flex flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/60 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative h-full">
        {isConnected && <BorderBeam size={100} duration={10} colorFrom="#d97706" colorTo="#b45309" />}
        <ConversationPanel messages={messages} messagesEndRef={messagesEndRef} mobile={false} sessionTitle={sessionTitle} />

        <BrainstormControls
          isConnected={isConnected}
          isStarting={isStarting}
          selectedFlashModel={selectedFlashModel}
          setSelectedFlashModel={setSelectedFlashModel}
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
    </main>
  )
}
