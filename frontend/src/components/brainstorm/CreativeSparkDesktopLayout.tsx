import { DotPattern } from '@/components/ui/dot-pattern'
import { Particles } from '@/components/ui/particles'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'
import { MasonryGallery } from './MasonryGallery'

/**
 * Desktop layout for Creative Spark mode.
 *
 * Full-screen masonry gallery with a right sidebar for conversation
 * and voice controls. Explicitly excludes all Open Studio elements
 * (AgentVisualizer, WorkspacePanel, tool toggles, model selector).
 */
export function CreativeSparkDesktopLayout({
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
}: BrainstormLayoutProps) {
  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      {/* Full-screen masonry gallery */}
      <div className="relative z-10 flex-1 overflow-hidden" data-testid="creative-spark-gallery-area">
        <MasonryGallery
          artifactList={artifactList}
          isGenerating={isGenerating}
          downloadArtifact={downloadArtifact}
          downloadAllArtifacts={downloadAllArtifacts}
        />
      </div>

      {/* Right sidebar: conversation + voice controls */}
      <div className="w-[30%] min-w-[340px] max-w-[480px] shrink-0 z-40 flex flex-col overflow-hidden rounded-l-[2rem] border-l border-white/[0.08] bg-black/60 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative h-full">
        <ConversationPanel
          messages={messages}
          messagesEndRef={messagesEndRef}
          mobile={false}
          sessionTitle={sessionTitle}
          onCreateShare={onCreateShare}
        />

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
    </main>
  )
}
