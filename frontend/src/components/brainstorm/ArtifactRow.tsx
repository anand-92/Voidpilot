import { Download, FileText, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'
import { formatFileSize, getArtifactSize, downloadSingleArtifact } from './utils'

export function ArtifactRow({
  artifact,
  isSelected,
  onSelect,
  downloadButtonClassName,
}: {
  artifact: BrainstormArtifact
  isSelected: boolean
  onSelect: () => void
  downloadButtonClassName?: string
}) {
  const isImage = artifact.mimeType === 'image/png'
  const size = getArtifactSize(artifact)

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200',
        isSelected
          ? 'border-amber-500/25 bg-amber-500/[0.08] shadow-[0_0_20px_rgba(217,119,6,0.06)]'
          : 'border-white/[0.05] bg-white/[0.02] hover:border-amber-500/15 hover:bg-amber-500/[0.03]',
      )}
      onClick={onSelect}
      onKeyDown={(event) => event.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
      {isImage ? (
        <ImageIcon className={cn('size-4 shrink-0', isSelected ? 'text-amber-400' : 'text-stone-500')} />
      ) : (
        <FileText className={cn('size-4 shrink-0', isSelected ? 'text-amber-400' : 'text-stone-500')} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{artifact.filename}</div>
        <div className="text-[10px] text-stone-600">{formatFileSize(size)}</div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.stopPropagation()
          downloadSingleArtifact(artifact)
        }}
        aria-label="Download artifact"
        className={
          downloadButtonClassName ??
          'flex size-7 shrink-0 items-center justify-center rounded-lg text-stone-600 opacity-0 transition-all hover:bg-white/[0.06] hover:text-stone-300 group-hover:opacity-100'
        }
        title="Download"
      >
        <Download className="size-3.5" />
      </Button>
    </div>
  )
}
