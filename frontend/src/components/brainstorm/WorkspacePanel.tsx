import type { Dispatch, SetStateAction } from 'react'
import { Download, FileText, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { MagicCard } from '@/components/ui/magic-card'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'
import { GeminiStar } from '../icons/GeminiIcons'
import { ArtifactPreview } from './ArtifactPreview'
import { ArtifactRow } from './ArtifactRow'
import { ActivitySpinner } from './ActivitySpinner'
import { formatFileSize, downloadAllArtifacts, downloadSingleArtifact } from './utils'

type WorkspacePanelProps = {
  artifacts: Map<string, BrainstormArtifact>
  artifactList: Array<[string, BrainstormArtifact]>
  totalSize: number
  isGenerating: boolean
  selectedArtifact: string | null
  currentArtifact: BrainstormArtifact | null
  setSelectedArtifact: Dispatch<SetStateAction<string | null>>
  mobile: boolean
}

export function WorkspacePanel({
  artifacts,
  artifactList,
  totalSize,
  isGenerating,
  selectedArtifact,
  currentArtifact,
  setSelectedArtifact,
  mobile,
}: WorkspacePanelProps) {
  const selectArtifact = (filename: string) => {
    setSelectedArtifact((previous) => (previous === filename ? null : filename))
  }

  if (mobile) {
    return (
      <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/[0.05] bg-stone-950/60 shadow-[0_20px_60px_rgba(12,10,9,0.4)]">
        <div className="shrink-0 border-b border-white/[0.05] px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Workspace</span>
            {artifactList.length > 0 && (
              <Badge
                variant="outline"
                className="ml-auto border-transparent bg-transparent px-0 text-[10px] font-medium uppercase tracking-widest text-stone-600"
              >
                {artifactList.length} {artifactList.length === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)}
              </Badge>
            )}
          </div>

          <Alert className="mt-3 rounded-2xl border-amber-500/15 bg-amber-500/[0.06] px-4 py-3">
            <TriangleAlert className="size-4 text-amber-300" />
            <AlertDescription className="text-sm leading-6 text-amber-300">
              Artifacts stay in this session only. Download anything you want to keep before disconnecting.
            </AlertDescription>
          </Alert>

          {isGenerating && (
            <div className="mt-3">
              <ActivitySpinner />
            </div>
          )}

          {artifactList.length > 0 && (
            <Button
              variant="outline"
              onClick={() => downloadAllArtifacts(artifacts)}
              className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-amber-500/20 bg-amber-500/[0.08] px-4 py-3 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/15"
            >
              <Download className="size-4" />
              Download All ({artifactList.length} {artifactList.length === 1 ? 'file' : 'files'})
            </Button>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          {artifactList.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.05] bg-stone-900/60">
                <GeminiStar className="size-6 text-amber-500/25" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-400">No artifacts yet</p>
                <p className="mt-1 text-sm leading-6 text-stone-500">
                  Ask Gemini to generate files and previews.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="columns-1 gap-4 space-y-4 sm:columns-2 pb-4">
                {artifactList.map(([filename, artifact]) => (
                  <div key={filename} className="break-inside-avoid">
                    <ArtifactRow
                      artifact={artifact}
                      isSelected={selectedArtifact === filename}
                      onSelect={() => selectArtifact(filename)}
                      downloadButtonClassName="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-stone-400 transition-all hover:bg-white/[0.08]"
                    />
                  </div>
                ))}
              </div>

              {currentArtifact ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                    Preview — {currentArtifact.filename}
                  </div>
                  <ArtifactPreview artifact={currentArtifact} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm leading-6 text-stone-500">
                  Tap an artifact to preview it here.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </section>
    )
  }

  return (
    <div className="flex h-full w-full gap-6">
      {/* List of artifacts */}
      <div className={cn("flex flex-col gap-4 transition-all duration-500", currentArtifact ? "w-[340px] shrink-0" : "w-full max-w-5xl mx-auto")}>
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.04] bg-stone-950/40 px-5 py-4 backdrop-blur-md">
          <FileText className="size-5 text-amber-500" />
          <span className="text-sm font-bold tracking-tight text-white">Workspace</span>
          {artifactList.length > 0 && (
            <Badge
              variant="outline"
              className="ml-auto border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-stone-300"
            >
              {artifactList.length} {artifactList.length === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)}
            </Badge>
          )}
        </div>

        {isGenerating && (
          <div className="mx-2 mt-2">
            <ActivitySpinner />
          </div>
        )}

        <ScrollArea className="flex min-h-0 flex-1 flex-col pr-4">
          {artifactList.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in duration-700">
              <div className="relative flex size-24 items-center justify-center rounded-[2rem] border border-white/[0.08] bg-stone-900/60 shadow-2xl backdrop-blur-xl">
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-transparent" />
                <GeminiStar className="size-10 text-amber-500/40" />
              </div>
              <div>
                <p className="text-lg font-semibold text-stone-200 tracking-tight">Your Canvas is Empty</p>
                <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
                  Start brainstorming with Gemini. Any code, text, or images generated will appear here as artifacts.
                </p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "columns-1 gap-4 space-y-4 pb-4", 
              currentArtifact ? "" : "sm:columns-2 xl:columns-3"
            )}>
              {artifactList.map(([filename, artifact]) => (
                <div key={filename} className="break-inside-avoid">
                  <MagicCard
                    className="rounded-2xl cursor-pointer shadow-lg"
                    gradientColor="#1c1917"
                    gradientFrom="#d97706"
                    gradientTo="#92400e"
                    gradientOpacity={0.4}
                    gradientSize={150}
                  >
                    <ArtifactRow
                      artifact={artifact}
                      isSelected={selectedArtifact === filename}
                      onSelect={() => selectArtifact(filename)}
                      downloadButtonClassName="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-stone-400 transition-all hover:bg-white/[0.08] hover:text-white"
                    />
                  </MagicCard>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {artifactList.length > 0 && !currentArtifact && (
          <div className="shrink-0 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
              variant="outline"
              onClick={() => downloadAllArtifacts(artifacts)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-amber-500/20 bg-amber-500/[0.08] px-4 py-6 text-sm font-bold tracking-wide text-amber-400 transition-all hover:bg-amber-500/20 hover:scale-[1.01] active:scale-[0.98]"
            >
              <Download className="size-5" />
              Download Archive ({artifactList.length} {artifactList.length === 1 ? 'file' : 'files'})
            </Button>
          </div>
        )}
      </div>

      {/* Main Preview Area */}
      {currentArtifact && (
        <div className="flex flex-1 flex-col min-w-0 min-h-0 rounded-[2rem] border border-white/[0.08] bg-black/40 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-8 duration-500 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-stone-950/60 px-6 py-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Preview</span>
              <span className="text-base font-semibold text-amber-400">{currentArtifact.filename}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => downloadSingleArtifact(currentArtifact)}
                className="size-9 rounded-xl hover:bg-white/10 text-stone-400"
                title="Download"
              >
                <Download className="size-4" />
              </Button>
              <div className="h-4 w-px bg-white/10" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedArtifact(null)}
                className="size-9 rounded-xl hover:bg-white/10 text-stone-400"
                title="Close Preview"
              >
                <span className="text-lg font-light leading-none">×</span>
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              <ArtifactPreview artifact={currentArtifact} />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
