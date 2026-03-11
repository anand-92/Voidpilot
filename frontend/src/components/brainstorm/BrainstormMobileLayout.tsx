import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { IconBrainstorm } from '../icons/CustomIcons'
import { GeminiChat } from '../icons/GeminiIcons'
import { StatusChip } from '../SharedUI'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { BrainstormControls } from './BrainstormControls'
import { ConversationPanel } from './ConversationPanel'
import { WorkspacePanel } from './WorkspacePanel'

export function BrainstormMobileLayout({
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
  const [activeTab, setActiveTab] = useState<string>('chat')

  useEffect(() => {
    if (artifactList.length > 0) {
      setSelectedArtifact((previous) => previous ?? artifactList[0][0])
    }
  }, [artifactList, setSelectedArtifact])

  return (
    <main className="relative flex min-h-dvh flex-col bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-40" quantity={60} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-30" width={32} height={32} cx={16} cy={16} cr={1} />
      
      <header className="sticky top-0 z-20 shrink-0 border-b border-white/[0.04] bg-stone-950/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_12px_32px_rgba(217,119,6,0.25)]">
                <IconBrainstorm className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <AnimatedGradientText colorFrom="#d97706" colorTo="#fbbf24" className="text-xs font-semibold uppercase tracking-[0.24em]">
                  Brainstorm
                </AnimatedGradientText>
                <h1 className="truncate text-lg font-semibold text-white">Mobile workspace</h1>
              </div>
            </div>
              <p className="mt-3 text-sm leading-6 text-stone-500">
              Chat and review artifacts without the desktop split view.
            </p>
          </div>
          <StatusChip isConnected={isConnected} isStarting={isStarting} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 w-full">
          <TabsList
            className={cn(
              'flex w-full rounded-[14px] border border-white/[0.05] bg-stone-900/60 p-1 h-auto',
            )}
          >
            <TabsTrigger
              value="chat"
              className={cn(
                'flex flex-1 min-h-9 items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors',
                'data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-200',
                'text-stone-500 hover:bg-white/[0.04] hover:text-stone-300',
              )}
            >
              <GeminiChat className="size-4" />
              Chat
              <Badge
                variant="outline"
                className="border-transparent bg-transparent px-0 text-xs text-stone-600"
              >
                {messages.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="workspace"
              className={cn(
                'flex flex-1 min-h-9 items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors',
                'data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-200',
                'text-stone-500 hover:bg-white/[0.04] hover:text-stone-300',
              )}
            >
              <FileText className="size-4" />
              Workspace
              <Badge
                variant="outline"
                className="border-transparent bg-transparent px-0 text-xs text-stone-600"
              >
                {artifactList.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        {activeTab === 'chat' ? (
          <>
            <section className="shrink-0 rounded-3xl border border-white/[0.05] bg-stone-900/40 p-4 shadow-[0_20px_60px_rgba(12,10,9,0.4)]">
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
                layout="mobile"
              />
            </section>

            <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/[0.05] bg-stone-950/60 shadow-[0_20px_60px_rgba(12,10,9,0.4)]">
              <ConversationPanel messages={messages} messagesEndRef={messagesEndRef} mobile />
            </section>
          </>
        ) : (
          <WorkspacePanel
            artifacts={artifacts}
            artifactList={artifactList}
            totalSize={totalSize}
            isGenerating={isGenerating}
            selectedArtifact={selectedArtifact}
            currentArtifact={currentArtifact}
            setSelectedArtifact={setSelectedArtifact}
            mobile
          />
        )}
      </div>
    </main>
  )
}
