import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Sparkles, Video, Loader2, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'

type MasonryGalleryProps = {
  artifactList: Array<[string, BrainstormArtifact]>
  isGenerating: boolean
  downloadArtifact: (filename: string) => Promise<void>
  downloadAllArtifacts: () => Promise<void>
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex size-24 items-center justify-center rounded-[2rem] border border-white/[0.08] bg-stone-900/60 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-orange-500/10 to-transparent" />
          <Sparkles className="size-10 text-orange-500/40" />
        </div>
        <div>
          <p className="text-lg font-semibold text-stone-200 tracking-tight">Your Gallery is Empty</p>
          <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
            Start talking with Gemini. Any images or videos generated will appear here in your gallery.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function GeneratingStateOverlay() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-sm"
    >
      <div className="relative flex items-center justify-center mt-10">
        <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse scale-150" />
        <Loader2 className="size-16 text-orange-500 animate-spin" />
      </div>
      <p className="mt-8 text-orange-400 font-mono tracking-widest text-sm animate-pulse font-bold drop-shadow-md">
        GENERATING VISUAL...
      </p>
    </motion.div>
  )
}

function GalleryStrip({
  artifacts,
  onDownload,
  fillHeight = false,
}: {
  artifacts: Array<[string, BrainstormArtifact]>
  onDownload: (f: string) => void
  fillHeight?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [previewFilename, setPreviewFilename] = useState<string | null>(null)

  const previewArtifact = useMemo(
    () => artifacts.find(([filename]) => filename === previewFilename) ?? null,
    [artifacts, previewFilename],
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      })
    }
  }, [artifacts.length])

  return (
    <div className={cn(
      'bg-black/60 backdrop-blur-xl flex flex-col relative z-30',
      fillHeight ? 'h-full border-t-0' : 'shrink-0 h-48 border-t border-white/10',
    )}>
      <div className="absolute top-3 left-6 text-xs font-bold tracking-widest text-stone-400 uppercase font-mono z-10 flex items-center gap-2">
        <ImageIcon className="size-3" /> My Art Gallery
      </div>

      {artifacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-stone-600 font-mono tracking-wider">Your creations will appear here</p>
        </div>
      ) : (
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 gap-4 px-6 pb-4',
          fillHeight
            ? 'flex flex-wrap content-start overflow-y-auto overflow-x-hidden pt-12'
            : 'flex items-center overflow-x-auto pt-10',
        )}
        style={{ overscrollBehavior: 'contain' }}
      >
        <AnimatePresence initial={false}>
          {artifacts.map(([filename, artifact]) => (
            <motion.div
              key={filename}
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              layout
              className={cn(
                'shrink-0 relative group cursor-pointer rounded-xl overflow-hidden border border-white/10 shadow-lg bg-stone-900',
                fillHeight ? 'w-full sm:w-[280px] aspect-video' : 'h-full aspect-video',
              )}
              onClick={() => setPreviewFilename(filename)}
            >
              {artifact.content !== null ? (
                artifact.mimeType.startsWith('video/') ? (
                  <>
                    <video
                      src={`data:video/mp4;base64,${artifact.content}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="size-6 text-white/70" />
                    </div>
                  </>
                ) : (
                  <img
                    src={`data:image/png;base64,${artifact.content}`}
                    alt={artifact.label ?? filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )
              ) : (
                <div className="flex w-full h-full items-center justify-center bg-stone-950/60">
                  {artifact.mimeType.startsWith('video/') ? (
                    <Video className="size-8 text-stone-700" />
                  ) : (
                    <ImageIcon className="size-8 text-stone-700" />
                  )}
                </div>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDownload(filename)
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full size-10"
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      <Dialog
        open={previewArtifact !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFilename(null)
          }
        }}
      >
        <DialogTitle className="sr-only">Artifact Preview</DialogTitle>
        {previewArtifact !== null ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl sm:p-6">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPreviewFilename(null)}
              aria-label="Close artifact preview"
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
            >
              <X className="size-4" />
            </Button>

            {previewArtifact[1].content !== null ? (
              previewArtifact[1].mimeType.startsWith('video/') ? (
                <video
                  src={`data:video/mp4;base64,${previewArtifact[1].content}`}
                  className="max-h-[92vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={`data:image/png;base64,${previewArtifact[1].content}`}
                  alt={previewArtifact[1].label ?? previewArtifact[0]}
                  className="max-h-[92vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl"
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="size-10 animate-spin text-stone-500" />
              </div>
            )}
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}

export function MasonryGallery({
  artifactList,
  isGenerating,
  downloadArtifact,
  downloadAllArtifacts,
}: MasonryGalleryProps) {
  const mediaArtifacts = artifactList.filter(
    ([, a]) => a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/'),
  )

  const hasMedia = mediaArtifacts.length > 0

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative font-sans">
      {hasMedia && !isGenerating && (
        <div className="absolute top-4 right-4 z-30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadAllArtifacts()}
            className="bg-black/50 border-white/10 hover:bg-black/70 text-white backdrop-blur-md rounded-full shadow-lg"
          >
            <Download className="mr-2 size-3.5" />
            Download All
          </Button>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasMedia && !isGenerating && <EmptyState key="empty" />}

          {isGenerating && <GeneratingStateOverlay key="generating" />}
        </AnimatePresence>

        {hasMedia && (
          <GalleryStrip
            artifacts={mediaArtifacts}
            onDownload={(f) => void downloadArtifact(f)}
            fillHeight
          />
        )}
      </div>
    </div>
  )
}
