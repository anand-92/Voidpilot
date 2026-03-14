import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ImageIcon, Play, Sparkles, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'
import { ActivitySpinner } from './ActivitySpinner'
import { formatFileSize, getArtifactSize } from './utils'

type MasonryGalleryProps = {
  artifactList: Array<[string, BrainstormArtifact]>
  isGenerating: boolean
  downloadArtifact: (filename: string) => Promise<void>
  downloadAllArtifacts: () => Promise<void>
}

/** Compute the number of masonry columns based on container width. */
function getColumnCount(width: number): number {
  if (width >= 1280) return 4
  if (width >= 1024) return 3
  if (width >= 768) return 2
  if (width >= 480) return 2
  return 1
}

/**
 * Distribute items across columns using a shortest-column-first approach
 * for true masonry (vertical packing) behaviour.
 */
function distributeItems<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  // Simple round-robin distribution — since we don't know exact heights
  // up-front, round-robin gives a good approximation for similarly-sized tiles.
  items.forEach((item, index) => {
    columns[index % columnCount].push(item)
  })
  return columns
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10">
          <Sparkles className="h-10 w-10 text-orange-400" />
        </div>
        <div className="max-w-sm space-y-3">
          <h2 className="text-2xl font-bold text-white">Creative Spark</h2>
          <p className="text-sm leading-relaxed text-stone-400">
            Start talking — images will appear here
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function ImageTile({
  artifact,
  onDownload,
}: {
  artifact: BrainstormArtifact
  onDownload: () => void
}) {
  const size = getArtifactSize(artifact)

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 shadow-lg">
      {artifact.content !== null ? (
        <img
          src={`data:image/png;base64,${artifact.content}`}
          alt={artifact.label ?? artifact.filename}
          className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-stone-950/60">
          <ImageIcon className="size-8 text-stone-700" />
        </div>
      )}

      {/* Hover overlay with label + download — always visible on touch devices via active state */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100">
        <div className="flex items-end justify-between gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {artifact.label ?? artifact.filename}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              {formatFileSize(size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            aria-label={`Download ${artifact.filename}`}
            className="flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 min-h-11 min-w-11 size-11 sm:min-h-9 sm:min-w-9 sm:size-9"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function VideoTile({
  artifact,
  onDownload,
}: {
  artifact: BrainstormArtifact
  onDownload: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const size = getArtifactSize(artifact)

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 shadow-lg">
      {artifact.content !== null ? (
        <>
          <video
            ref={videoRef}
            src={`data:video/mp4;base64,${artifact.content}`}
            className="w-full object-cover"
            preload="metadata"
            controls={isPlaying}
            onClick={togglePlay}
            onEnded={() => setIsPlaying(false)}
          />
          {/* Play overlay — hidden once playing */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
              aria-label="Play video"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-orange-500/90 text-stone-900 shadow-lg">
                <Play className="size-6 ml-0.5" />
              </div>
            </button>
          )}
        </>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-stone-950/60">
          <Video className="size-8 text-stone-700" />
        </div>
      )}

      {/* Hover overlay with label + download — always visible on touch via active */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300',
          isPlaying ? 'opacity-0 group-hover:opacity-100 group-active:opacity-100' : 'opacity-0 group-hover:opacity-100 group-active:opacity-100',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {artifact.label ?? artifact.filename}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-stone-400">
            {formatFileSize(size)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
          aria-label={`Download ${artifact.filename}`}
          className="flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 min-h-11 min-w-11 size-11 sm:min-h-9 sm:min-w-9 sm:size-9"
        >
          <Download className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MasonryGallery({
  artifactList,
  isGenerating,
  downloadArtifact,
  downloadAllArtifacts,
}: MasonryGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(3)

  // Observe container width to decide column count
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setColumnCount(getColumnCount(entry.contentRect.width))
      }
    })

    ro.observe(container)
    // Set initial column count
    setColumnCount(getColumnCount(container.clientWidth))

    return () => ro.disconnect()
  }, [])

  // Filter to only image/video artifacts for the gallery
  const mediaArtifacts = artifactList.filter(
    ([, a]) => a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/'),
  )

  const hasMedia = mediaArtifacts.length > 0

  // Distribute tiles across columns
  const columns = distributeItems(mediaArtifacts, columnCount)

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col overflow-y-auto"
      style={{ overscrollBehavior: 'contain' }}
      data-testid="masonry-gallery"
    >
      {/* Top bar: loading + download all */}
      {(hasMedia || isGenerating) && (
        <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.04] bg-[#0a0a0a]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            {isGenerating && <ActivitySpinner />}
            {!isGenerating && hasMedia && (
              <p className="text-xs font-medium text-stone-500">
                {mediaArtifacts.length} {mediaArtifacts.length === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>

          {hasMedia && (
            <Button
              variant="outline"
              onClick={() => void downloadAllArtifacts()}
              className="flex cursor-pointer items-center gap-2 rounded-xl border-amber-500/20 bg-amber-500/[0.08] px-4 py-2 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500/15 min-h-11 sm:min-h-0"
              data-testid="download-all-button"
            >
              <Download className="size-3.5" />
              Download All
            </Button>
          )}
        </div>
      )}

      {/* Loading-only state (generating but no media yet) */}
      {!hasMedia && isGenerating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <ActivitySpinner />
          <p className="text-sm text-stone-500">
            Generating your first creation…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasMedia && !isGenerating && <EmptyState />}

      {/* Masonry grid */}
      {hasMedia && (
        <div
          className="flex gap-3 p-4 sm:gap-4 sm:p-6"
          data-testid="masonry-grid"
        >
          {columns.map((column, colIndex) => (
            <div
              key={colIndex}
              className="flex flex-1 flex-col gap-3 sm:gap-4"
            >
              <AnimatePresence initial={false}>
                {column.map(([filename, artifact]) => (
                  <motion.div
                    key={filename}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    layout
                  >
                    {artifact.mimeType.startsWith('video/') ? (
                      <VideoTile
                        artifact={artifact}
                        onDownload={() => void downloadArtifact(filename)}
                      />
                    ) : (
                      <ImageTile
                        artifact={artifact}
                        onDownload={() => void downloadArtifact(filename)}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
