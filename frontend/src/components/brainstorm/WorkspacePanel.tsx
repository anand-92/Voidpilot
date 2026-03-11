import type { Dispatch, SetStateAction } from 'react'
import { Download, FileText, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MagicCard } from '@/components/ui/magic-card'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'
import { GeminiStar } from '../icons/GeminiIcons'
import { ArtifactPreview } from './ArtifactPreview'
import { ArtifactRow } from './ArtifactRow'
import { ActivitySpinner } from './ActivitySpinner'
import { formatFileSize, downloadAllArtifacts } from './utils'

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
                  Save snapshots or ask Gemini to generate files and previews.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {artifactList.map(([filename, artifact]) => (
                  <ArtifactRow
                    key={filename}
                    artifact={artifact}
                    isSelected={selectedArtifact === filename}
                    onSelect={() => selectArtifact(filename)}
                    downloadButtonClassName="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-stone-400 transition-all hover:bg-white/[0.08]"
                  />
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
    <div className="flex min-w-0 flex-[2] flex-col bg-stone-950/40">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] bg-stone-950/40 px-5 py-3">
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

      <Alert className="mx-4 mt-3 flex items-center gap-2 rounded-xl border-amber-500/15 bg-amber-500/[0.06] px-4 py-2.5">
        <TriangleAlert className="size-4 shrink-0 text-amber-300" />
        <AlertDescription className="text-xs text-amber-300">
          Artifacts are stored in your session. Download before disconnecting.
        </AlertDescription>
      </Alert>

      {isGenerating && (
        <div className="mx-4 mt-3">
          <ActivitySpinner />
        </div>
      )}

      <ScrollArea className="flex min-h-0 flex-1 flex-col px-4 py-3">
        {artifactList.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.05] bg-stone-900/60">
              <GeminiStar className="size-6 text-amber-500/25" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-400">No artifacts yet</p>
              <p className="mt-1 text-xs text-stone-600">Start brainstorming — artifacts will appear here</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {artifactList.map(([filename, artifact]) => (
                <MagicCard
                  key={filename}
                  className="rounded-xl"
                  gradientColor="#1c1917"
                  gradientFrom="#d97706"
                  gradientTo="#92400e"
                  gradientOpacity={0.3}
                  gradientSize={120}
                >
                  <ArtifactRow
                    artifact={artifact}
                    isSelected={selectedArtifact === filename}
                    onSelect={() => selectArtifact(filename)}
                  />
                </MagicCard>
              ))}
            </div>

            {currentArtifact && (
              <div className="mt-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                  Preview — {currentArtifact.filename}
                </div>
                <ArtifactPreview artifact={currentArtifact} />
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {artifactList.length > 0 && (
        <>
          <Separator className="bg-white/[0.04]" />
          <div className="shrink-0 p-4">
            <Button
              variant="outline"
              onClick={() => downloadAllArtifacts(artifacts)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-amber-500/20 bg-amber-500/[0.08] px-4 py-3 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/15"
            >
              <Download className="size-4" />
              Download All ({artifactList.length} {artifactList.length === 1 ? 'file' : 'files'})
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
