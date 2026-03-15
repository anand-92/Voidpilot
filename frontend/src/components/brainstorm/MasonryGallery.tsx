import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Play, Sparkles, Video, Maximize2, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'

type MasonryGalleryProps = {
  artifactList: Array<[string, BrainstormArtifact]>
  isGenerating: boolean
  downloadArtifact: (filename: string) => Promise<void>
  downloadAllArtifacts: () => Promise<void>
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center absolute inset-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative z-10 flex size-20 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.4)] animate-pulse">
          <Sparkles className="size-10 text-orange-500" />
        </div>
        <div className="max-w-sm space-y-3 relative z-10">
          <h2 className="text-2xl font-bold text-white">Creative Spark</h2>
          <p className="text-sm leading-relaxed text-stone-400">
            Start talking — visuals will appear here
          </p>
        </div>
      </motion.div>
    </div>
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

function MainStageArtifactView({
  artifact,
  filename,
  onDownload,
}: {
  artifact: BrainstormArtifact
  filename: string
  onDownload: () => void
}) {
  const isVideo = artifact.mimeType.startsWith('video/')
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  if (artifact.content === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-4 flex flex-col items-center justify-center gap-4"
      >
        {isVideo ? <Video className="size-16 text-stone-600" /> : <ImageIcon className="size-16 text-stone-600" />}
        <p className="text-sm text-stone-500">Loading content...</p>
      </motion.div>
    )
  }

  const content = isVideo ? (
    <div className="relative w-full h-full flex items-center justify-center group">
      <video
        ref={videoRef}
        src={`data:video/mp4;base64,${artifact.content}`}
        className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-xl"
        controls={isPlaying}
        onClick={togglePlay}
        onEnded={() => setIsPlaying(false)}
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40 z-10 rounded-xl"
        >
          <div className="flex size-20 items-center justify-center rounded-full bg-orange-500/90 text-stone-900 shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:scale-105 transition-transform">
            <Play className="size-8 ml-1" />
          </div>
        </button>
      )}
    </div>
  ) : (
    <img
      src={`data:image/png;base64,${artifact.content}`}
      alt={artifact.label ?? filename}
      className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-xl"
    />
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-4 flex items-center justify-center"
    >
      {content}

      {/* Top right controls */}
      <div className="absolute top-0 right-0 flex gap-2 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={onDownload}
          className="bg-black/50 border-white/10 hover:bg-black/70 text-white backdrop-blur-md rounded-full"
          title="Download"
        >
          <Download className="size-4" />
        </Button>
        <Dialog>
          <DialogTrigger render={
            <Button
              variant="outline"
              size="icon"
              className="bg-black/50 border-white/10 hover:bg-black/70 text-white backdrop-blur-md rounded-full"
              title="Pop out"
            />
          }>
            <Maximize2 className="size-4" />
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-black/90 backdrop-blur-xl flex items-center justify-center shadow-2xl">
            <DialogTitle className="sr-only">Artifact Preview</DialogTitle>
            {isVideo ? (
              <video
                src={`data:video/mp4;base64,${artifact.content}`}
                className="max-w-full max-h-[95vh] object-contain rounded-lg"
                controls
                autoPlay
              />
            ) : (
              <img
                src={`data:image/png;base64,${artifact.content}`}
                alt={artifact.label ?? filename}
                className="max-w-full max-h-[95vh] object-contain rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  )
}

function GalleryStrip({
  artifacts,
  onDownload,
}: {
  artifacts: Array<[string, BrainstormArtifact]>
  onDownload: (f: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      })
    }
  }, [artifacts.length])

  return (
    <div className="shrink-0 h-48 bg-black/60 backdrop-blur-xl border-t border-white/10 flex flex-col relative z-30">
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
        className="flex-1 overflow-x-auto flex items-center gap-4 px-6 pt-10 pb-4"
        style={{ overscrollBehavior: 'contain' }}
      >
        <AnimatePresence initial={false}>
          {artifacts.map(([filename, artifact]) => (
            <motion.div
              key={filename}
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              layout
              className="shrink-0 h-full aspect-video relative group rounded-xl overflow-hidden border border-white/10 shadow-lg bg-stone-900"
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
                  onClick={() => onDownload(filename)}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full size-10"
                >
                  <Download className="size-4" />
                </Button>
                <Dialog>
                  <DialogTrigger render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full size-10"
                    />
                  }>
                    <Maximize2 className="size-4" />
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-black/90 backdrop-blur-xl flex items-center justify-center">
                    <DialogTitle className="sr-only">Artifact Preview</DialogTitle>
                    {artifact.content !== null ? (
                      artifact.mimeType.startsWith('video/') ? (
                        <video
                          src={`data:video/mp4;base64,${artifact.content}`}
                          className="max-w-full max-h-[95vh] object-contain rounded-lg"
                          controls
                          autoPlay
                        />
                      ) : (
                        <img
                          src={`data:image/png;base64,${artifact.content}`}
                          alt={artifact.label ?? filename}
                          className="max-w-full max-h-[95vh] object-contain rounded-lg"
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center p-20">
                        <Loader2 className="size-10 text-stone-500 animate-spin" />
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}
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

  let mainStageItem: [string, BrainstormArtifact] | null = null
  let galleryItems: Array<[string, BrainstormArtifact]> = []

  if (isGenerating) {
    galleryItems = mediaArtifacts
    mainStageItem = null
  } else if (hasMedia) {
    mainStageItem = mediaArtifacts[mediaArtifacts.length - 1]
    galleryItems = mediaArtifacts.slice(0, -1)
  }

  return (
    <div className="flex h-full w-full flex-col bg-black overflow-hidden relative font-sans">
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

          {mainStageItem && !isGenerating && (
            <MainStageArtifactView
              key={`main-${mainStageItem[0]}`}
              filename={mainStageItem[0]}
              artifact={mainStageItem[1]}
              onDownload={() => void downloadArtifact(mainStageItem[0])}
            />
          )}
        </AnimatePresence>
      </div>

      <GalleryStrip
        artifacts={galleryItems}
        onDownload={(f) => void downloadArtifact(f)}
      />
    </div>
  )
}
