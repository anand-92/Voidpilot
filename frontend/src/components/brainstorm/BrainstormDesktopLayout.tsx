import { Separator } from '@/components/ui/separator'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { BorderBeam } from '@/components/ui/border-beam'
import { IconBrainstorm } from '../icons/CustomIcons'
import { StatusChip } from '../SharedUI'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { BrainstormControls } from './BrainstormControls'
import { ConversationPanel } from './ConversationPanel'
import { WorkspacePanel } from './WorkspacePanel'

export function BrainstormDesktopLayout({
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
  sendSnapshot,
}: BrainstormLayoutProps) {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0c0a09] text-stone-100">
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.04] bg-stone-950/80 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <IconBrainstorm className="size-4 text-white" />
          </div>
          <AnimatedGradientText colorFrom="#d97706" colorTo="#fbbf24" className="text-sm font-semibold tracking-tight">
            Brainstorm Mode
          </AnimatedGradientText>
        </div>

        <StatusChip isConnected={isConnected} isStarting={isStarting} />
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-[3] flex-col border-r border-white/[0.04]">
          {isConnected && <BorderBeam size={50} duration={6} colorFrom="#d97706" colorTo="#b45309" />}
          <ConversationPanel messages={messages} messagesEndRef={messagesEndRef} mobile={false} />

          <Separator className="bg-white/[0.04]" />

          <div className="shrink-0 bg-stone-950/40 px-5 py-3.5">
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
              sendSnapshot={sendSnapshot}
              layout="desktop"
            />
          </div>
        </div>

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
    </main>
  )
}
