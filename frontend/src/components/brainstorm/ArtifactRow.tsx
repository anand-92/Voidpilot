import { Download, FileText, ImageIcon, Video } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'
import { formatFileSize, getArtifactSize } from './utils'

export function ArtifactRow({
  artifact,
  isSelected,
  onSelect,
  onDownload,
  downloadButtonClassName,
}: {
  artifact: BrainstormArtifact
  isSelected: boolean
  onSelect: () => void
  onDownload: () => void
  downloadButtonClassName?: string
}) {
  const isImage = artifact.mimeType === 'image/png'
  const isVideo = artifact.mimeType === 'video/mp4'
  const isText = artifact.mimeType === 'text/markdown' || artifact.mimeType === 'text/plain'
  const size = getArtifactSize(artifact)

  return (
    <div
      className={cn(
        'group flex flex-col cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300',
        isSelected
          ? 'border-amber-500/40 bg-amber-500/[0.08] shadow-[0_0_30px_rgba(37,99,235,0.1)]'
          : 'border-white/[0.06] bg-black/40 hover:border-amber-500/30 hover:bg-amber-500/[0.05]',
      )}
      onClick={onSelect}
      onKeyDown={(event) => event.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
      {isImage && artifact.content !== null && (
        <div className="relative aspect-video w-full overflow-hidden border-b border-white/[0.06] bg-stone-950/50">
          <img 
            src={`data:image/png;base64,${artifact.content}`}
            alt={artifact.label ?? artifact.filename}
            className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      )}
      
      {isVideo && artifact.content !== null && (
        <div className="relative aspect-video w-full overflow-hidden border-b border-white/[0.06] bg-stone-950/50">
          <video
            src={`data:video/mp4;base64,${artifact.content}`}
            className="h-full w-full object-contain"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/90 text-stone-900">
              <Video className="size-6 ml-1" />
            </div>
          </div>
        </div>
      )}
      
      {isText && artifact.content !== null && (
        <div className="relative h-48 w-full border-b border-white/[0.06] bg-stone-950/50 p-4">
          <ScrollArea className="h-full w-full mask-image-bottom">
            <div className="prose prose-invert prose-xs max-w-none prose-headings:text-stone-300 prose-p:text-stone-400 prose-a:text-amber-500 prose-code:text-amber-400 prose-pre:bg-stone-900/50 pointer-events-none">
              <ReactMarkdown>{artifact.content}</ReactMarkdown>
            </div>
          </ScrollArea>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
        </div>
      )}

      {artifact.content === null && (
        <div className="flex h-28 w-full items-center justify-center border-b border-white/[0.06] bg-stone-950/50 px-4 text-center text-xs uppercase tracking-[0.2em] text-stone-600">
          Select to load preview
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3">
        {isImage ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <ImageIcon className="size-4" />
          </div>
        ) : isVideo ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
            <Video className="size-4" />
          </div>
        ) : (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-stone-400 group-hover:bg-stone-700 group-hover:text-stone-300">
            <FileText className="size-4" />
          </div>
        )}
        
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-sm font-semibold", isSelected ? "text-amber-400" : "text-stone-200")}>
            {artifact.filename}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500">
            {formatFileSize(size)}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(event) => {
            event.stopPropagation()
            onDownload()
          }}
          aria-label="Download artifact"
          className={cn(
            downloadButtonClassName ??
            'flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-stone-400 opacity-0 transition-all hover:bg-white/[0.1] hover:text-white group-hover:opacity-100'
          )}
          title="Download"
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
