import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { BrainstormControls } from './BrainstormControls'
import { ConversationPanel } from './ConversationPanel'
import { WorkspacePanel } from './WorkspacePanel'
import { FloatingAgentWindow } from './FloatingAgentWindow'

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
}: BrainstormLayoutProps) {
  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans p-6 gap-6">
      <Particles className="absolute inset-0 z-0 opacity-40" quantity={120} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-50" width={32} height={32} cx={16} cy={16} cr={1} />

      {/* Floating agent visualizer window */}
      <FloatingAgentWindow
        intensityRef={intensityRef}
        isGenerating={isGenerating}
        isConnected={isConnected}
      />

      {/* Left Pane (70%) */}
      <div className="flex-1 flex flex-col gap-6 w-[70%] z-40 h-full min-w-0">

        {/* Workspace Panel */}
        <div className="flex-1 min-h-0 flex flex-col z-40 transition-all duration-500 relative">
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

      {/* Right Sidebar (30%) */}
      <div className="w-[30%] min-w-[340px] max-w-[480px] shrink-0 z-40 flex flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/60 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative h-full">
        {isConnected && <BorderBeam size={100} duration={10} colorFrom="#d97706" colorTo="#b45309" />}
        <ConversationPanel messages={messages} toolActivityEntries={toolActivityEntries} messagesEndRef={messagesEndRef} mobile={false} sessionTitle={sessionTitle} onCreateShare={onCreateShare} />

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
    </main>
  )
}
