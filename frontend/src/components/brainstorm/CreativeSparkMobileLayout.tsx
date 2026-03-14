import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { StatusChip } from '../SharedUI'
import type { BrainstormLayoutProps } from './BrainstormLayouts'
import { ConversationPanel } from './ConversationPanel'
import { CreativeSparkControls } from './CreativeSparkControls'
import { MasonryGallery } from './MasonryGallery'

/**
 * Mobile layout for Creative Spark mode.
 *
 * Full-screen masonry gallery with a conversation panel and controls
 * at the bottom. Excludes all Open Studio elements (AgentVisualizer,
 * WorkspacePanel, tool toggles, model selector, workspace tab).
 */
export function CreativeSparkMobileLayout({
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
    <main className="relative flex h-dvh flex-col bg-[#0a0a0a] text-stone-100 font-sans">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={40} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-20" width={24} height={24} cx={12} cy={12} cr={0.8} />

      <header className={cn(
        'sticky top-0 z-20 shrink-0 border-b border-white/[0.04]',
        'bg-stone-950/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-[0_12px_32px_rgba(249,115,22,0.25)]">
              <Sparkles className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <AnimatedGradientText colorFrom="#f97316" colorTo="#fb923c" className="text-[10px] font-semibold uppercase tracking-[0.24em]">
                Creative Spark
              </AnimatedGradientText>
              <h1 className="truncate text-sm font-semibold text-white">Inspiration mode</h1>
            </div>
          </div>
          <StatusChip isConnected={isConnected} isStarting={isStarting} />
        </div>
      </header>

      {/* Masonry gallery — takes remaining space */}
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden" data-testid="creative-spark-gallery-area">
        <MasonryGallery
          artifactList={artifactList}
          isGenerating={isGenerating}
          downloadArtifact={downloadArtifact}
          downloadAllArtifacts={downloadAllArtifacts}
        />
      </div>

      {/* Conversation + controls at the bottom */}
      <div className="relative z-20 flex shrink-0 flex-col gap-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <section className="flex min-h-0 flex-col rounded-3xl border border-white/[0.05] bg-stone-950/60 shadow-[0_20px_60px_rgba(12,10,9,0.4)] max-h-[30vh]">
          <ConversationPanel
            messages={messages}
            messagesEndRef={messagesEndRef}
            mobile
            sessionTitle={sessionTitle}
            onCreateShare={onCreateShare}
          />
        </section>

        <section className="shrink-0 rounded-3xl border border-white/[0.05] bg-stone-900/40 p-4 shadow-[0_20px_60px_rgba(12,10,9,0.4)]">
          <CreativeSparkControls
            isConnected={isConnected}
            isStarting={isStarting}
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
            handleConnect={handleConnect}
            stop={stop}
            layout="mobile"
          />
        </section>
      </div>
    </main>
  )
}
