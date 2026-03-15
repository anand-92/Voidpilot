import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, FileText, ImageIcon, Video, ArrowLeft, Share2, AlertCircle, Sparkles, Play, MessageSquareText, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShineBorder } from '@/components/ui/shine-border'
import { GeminiChat, GeminiStar } from '@/components/icons/GeminiIcons'
import { IconBrainstorm } from '@/components/icons/CustomIcons'
import {
  fetchPublicShare,
  downloadPublicArtifact,
  type PublicShareData,
  type PublicShareArtifact,
  type PublicShareTurn,
} from '@/lib/brainstormShareApi'

type SharePageState =
  | { kind: 'loading' }
  | { kind: 'loaded'; data: PublicShareData }
  | { kind: 'error'; message: string }

export default function SharePage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [state, setState] = useState<SharePageState>({ kind: 'loading' })
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)

  useEffect(() => {
    if (!shareToken) {
      return
    }

    let cancelled = false

    fetchPublicShare(shareToken)
      .then((data) => {
        if (!cancelled) {
          setState({ kind: 'loaded', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : 'Failed to load share'
          setState({ kind: 'error', message: msg })
        }
      })

    return () => {
      cancelled = true
    }
  }, [shareToken])

  // Handle missing shareToken without setState in effect
  if (!shareToken) {
    return <ShareErrorState message="No share token provided." />
  }

  if (state.kind === 'loading') {
    return <ShareLoadingState />
  }

  if (state.kind === 'error') {
    return <ShareErrorState message={state.message} />
  }

  const { session, turns, artifacts } = state.data
  const isCreativeSpark = session.brainstormType === 'creative_spark'
  const selectedArtifactData = selectedArtifact
    ? artifacts.find((a) => a.artifactId === selectedArtifact) ?? null
    : null

  if (isCreativeSpark) {
    return (
      <CreativeSparkShareLayout
        session={session}
        turns={turns}
        artifacts={artifacts}
        shareToken={shareToken ?? ''}
      />
    )
  }

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] font-sans text-stone-100">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={32} height={32} cx={16} cy={16} cr={1} />

      {/* Header */}
      <ShareHeader session={session} />

      {/* Content */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-0 md:gap-6 md:p-6">
        {/* Conversation Panel */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-[2rem] md:border md:border-white/[0.08] md:bg-black/60 md:backdrop-blur-3xl">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] bg-stone-950/40 px-5 py-3">
            <GeminiChat className="size-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Conversation</span>
            <Badge
              variant="outline"
              className="ml-auto border-transparent bg-transparent px-0 text-[10px] font-medium uppercase tracking-widest text-stone-600"
            >
              {turns.length} messages
            </Badge>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-5 py-4">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-stone-900/60">
                  <IconBrainstorm className="size-7 text-amber-500/30" />
                </div>
                <p className="text-sm text-stone-500">No conversation yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {turns.map((turn, index) => (
                  <PublicMessageBubble key={index} turn={turn} />
                ))}
              </div>
            )}
          </ScrollArea>
        </section>

        {/* Artifacts Panel */}
        {artifacts.length > 0 && (
          <section className="flex min-h-0 w-full flex-col overflow-hidden border-t border-white/[0.05] md:w-[400px] md:shrink-0 md:rounded-[2rem] md:border md:border-white/[0.08] md:bg-black/60 md:backdrop-blur-3xl lg:w-[440px]">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] bg-stone-950/40 px-5 py-3">
              <GeminiStar className="size-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Artifacts</span>
              <Badge
                variant="outline"
                className="ml-auto border-transparent bg-transparent px-0 text-[10px] font-medium uppercase tracking-widest text-stone-600"
              >
                {artifacts.length} {artifacts.length === 1 ? 'file' : 'files'}
              </Badge>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-4 py-4">
              <div className="flex flex-col gap-4">
                {artifacts.map((artifact) => (
                  <PublicArtifactCard
                    key={artifact.artifactId}
                    artifact={artifact}
                    shareToken={shareToken ?? ''}
                    isSelected={selectedArtifact === artifact.artifactId}
                    onSelect={() =>
                      setSelectedArtifact((prev) =>
                        prev === artifact.artifactId ? null : artifact.artifactId,
                      )
                    }
                  />
                ))}

                {selectedArtifactData && (
                  <PublicArtifactPreview
                    artifact={selectedArtifactData}
                    shareToken={shareToken ?? ''}
                    onClose={() => setSelectedArtifact(null)}
                  />
                )}
              </div>
            </ScrollArea>
          </section>
        )}
      </div>
    </main>
  )
}

// ── Sub-components ──────────────────────────────────────────────

// ── Shared header ──────────────────────────────────────────────

function ShareHeader({ session }: { session: PublicShareData['session'] }) {
  const isCreativeSpark = session.brainstormType === 'creative_spark'

  return (
    <header className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/[0.06] bg-black/60 px-6 py-4 backdrop-blur-xl">
      <Link
        to="/"
        className="flex items-center gap-2 text-stone-500 transition-colors hover:text-stone-300"
      >
        <ArrowLeft className="size-4" />
        <span className="text-sm font-medium">Voidpilot</span>
      </Link>

      <Separator orientation="vertical" className="h-5 bg-white/[0.08]" />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          isCreativeSpark ? 'bg-orange-500/10' : 'bg-amber-500/10',
        )}>
          {isCreativeSpark ? (
            <Sparkles className="size-4 text-orange-400" />
          ) : (
            <IconBrainstorm className="size-4 text-amber-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-stone-100">
            {session.title}
          </h1>
          {session.ownerName && (
            <p className="truncate text-[11px] text-stone-500">
              by {session.ownerName}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isCreativeSpark && (
          <Badge
            variant="outline"
            className="gap-1.5 border-orange-500/20 bg-orange-500/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-orange-400/80"
          >
            <Sparkles className="size-2.5" />
            Creative Spark
          </Badge>
        )}
        <Badge
          variant="outline"
          className="gap-1.5 border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400/80"
        >
          <Share2 className="size-3" />
          Shared
        </Badge>
      </div>
    </header>
  )
}

// ── Creative Spark share layout (masonry gallery) ──────────────

function getShareColumnCount(width: number): number {
  if (width >= 1280) return 4
  if (width >= 1024) return 3
  if (width >= 768) return 2
  if (width >= 480) return 2
  return 1
}

function distributeShareItems<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount].push(item)
  })
  return columns
}

function CreativeSparkShareLayout({
  session,
  turns,
  artifacts,
  shareToken,
}: {
  session: PublicShareData['session']
  turns: PublicShareTurn[]
  artifacts: PublicShareArtifact[]
  shareToken: string
}) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const mediaArtifacts = artifacts.filter(
    (a) => a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/'),
  )

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] font-sans text-stone-100">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={100} color="#f97316" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={24} height={24} cx={12} cy={12} cr={0.8} />

      {/* Header */}
      <ShareHeader session={session} />

      {/* Gallery area */}
      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden" data-testid="share-creative-spark-gallery">
          <PublicMasonryGallery
            artifacts={mediaArtifacts}
            shareToken={shareToken}
          />
        </div>
      </div>

      {/* Conversation toggle */}
      <button
        type="button"
        onClick={() => setIsPanelOpen((v) => !v)}
        aria-label={isPanelOpen ? 'Hide conversation' : 'Show conversation'}
        data-testid="share-conversation-toggle"
        className={cn(
          'fixed z-50 flex items-center justify-center rounded-2xl border border-white/[0.08] shadow-lg backdrop-blur-xl transition-all duration-300',
          'hover:scale-105 hover:border-orange-500/30 hover:shadow-orange-500/10',
          isPanelOpen
            ? 'right-[416px] top-16 size-10 bg-white/[0.06]'
            : 'right-5 top-16 gap-2 bg-orange-500/10 px-4 py-2.5',
        )}
      >
        {isPanelOpen ? (
          <X className="size-4 text-stone-400" />
        ) : (
          <>
            <MessageSquareText className="size-4 text-orange-400" />
            {turns.length > 0 && (
              <span className="text-xs font-medium text-orange-300">
                {turns.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Collapsible conversation panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: 416 }}
            animate={{ x: 0 }}
            exit={{ x: 416 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-40 flex h-full flex-col overflow-hidden border-l border-white/[0.08] bg-black/70 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            style={{ width: 400 }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] bg-stone-950/40 px-5 py-3">
              <GeminiChat className="size-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Conversation</span>
              <Badge
                variant="outline"
                className="ml-auto border-transparent bg-transparent px-0 text-[10px] font-medium uppercase tracking-widest text-stone-600"
              >
                {turns.length} messages
              </Badge>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-5 py-4">
              {turns.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <p className="text-sm text-stone-500">No conversation yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {turns.map((turn, index) => (
                    <PublicMessageBubble key={index} turn={turn} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function PublicMasonryGallery({
  artifacts,
  shareToken,
}: {
  artifacts: PublicShareArtifact[]
  shareToken: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(3)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setColumnCount(getShareColumnCount(entry.contentRect.width))
      }
    })

    ro.observe(container)
    setColumnCount(getShareColumnCount(container.clientWidth))

    return () => ro.disconnect()
  }, [])

  if (artifacts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10">
            <Sparkles className="h-10 w-10 text-orange-400" />
          </div>
          <p className="text-sm text-stone-500">No images generated in this session</p>
        </div>
      </div>
    )
  }

  const columns = distributeShareItems(artifacts, columnCount)

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col overflow-y-auto"
      style={{ overscrollBehavior: 'contain' }}
      data-testid="share-masonry-gallery"
    >
      <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.04] bg-[#0a0a0a]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <p className="text-xs font-medium text-stone-500">
          {artifacts.length} {artifacts.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="flex gap-3 p-4 sm:gap-4 sm:p-6" data-testid="share-masonry-grid">
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className="flex flex-1 flex-col gap-3 sm:gap-4"
          >
            <AnimatePresence initial={false}>
              {column.map((artifact) => (
                <motion.div
                  key={artifact.artifactId}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  layout
                >
                  {artifact.mimeType.startsWith('video/') ? (
                    <PublicVideoTile artifact={artifact} shareToken={shareToken} />
                  ) : (
                    <PublicImageTile artifact={artifact} shareToken={shareToken} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

function PublicImageTile({
  artifact,
  shareToken,
}: {
  artifact: PublicShareArtifact
  shareToken: string
}) {
  const [imageData, setImageData] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    downloadPublicArtifact(shareToken, artifact.artifactId)
      .then(async ({ blob }) => {
        if (cancelled) return
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i])
        }
        setImageData(btoa(binary))
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('Failed to load image tile:', error)
        }
      })
    return () => { cancelled = true }
  }, [shareToken, artifact.artifactId])

  const handleDownload = useCallback(() => {
    void downloadPublicArtifact(shareToken, artifact.artifactId).then(
      ({ blob, filename }) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      },
    )
  }, [shareToken, artifact.artifactId])

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 shadow-lg">
      {imageData ? (
        <img
          src={`data:${artifact.mimeType};base64,${imageData}`}
          alt={artifact.label ?? artifact.filename}
          className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-stone-950/60">
          <ImageIcon className="size-8 text-stone-700 animate-pulse" />
        </div>
      )}

      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100">
        <div className="flex items-end justify-between gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {artifact.label ?? artifact.filename}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            aria-label={`Download ${artifact.filename}`}
            className="flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 size-9"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PublicVideoTile({
  artifact,
  shareToken,
}: {
  artifact: PublicShareArtifact
  shareToken: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoData, setVideoData] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    downloadPublicArtifact(shareToken, artifact.artifactId)
      .then(async ({ blob }) => {
        if (cancelled) return
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i])
        }
        setVideoData(btoa(binary))
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('Failed to load video tile:', error)
        }
      })
    return () => { cancelled = true }
  }, [shareToken, artifact.artifactId])

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

  const handleDownload = useCallback(() => {
    void downloadPublicArtifact(shareToken, artifact.artifactId).then(
      ({ blob, filename }) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      },
    )
  }, [shareToken, artifact.artifactId])

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 shadow-lg">
      {videoData ? (
        <>
          <video
            ref={videoRef}
            src={`data:${artifact.mimeType};base64,${videoData}`}
            className="w-full object-cover"
            preload="metadata"
            controls={isPlaying}
            onClick={togglePlay}
            onEnded={() => setIsPlaying(false)}
          />
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
          <Video className="size-8 text-stone-700 animate-pulse" />
        </div>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300',
          'opacity-0 group-hover:opacity-100 group-active:opacity-100',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {artifact.label ?? artifact.filename}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            handleDownload()
          }}
          aria-label={`Download ${artifact.filename}`}
          className="flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 size-9"
        >
          <Download className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Layout sub-components ──────────────────────────────────────

function ShareLoadingState() {
  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] font-sans text-stone-100">
      <Particles className="absolute inset-0 z-0 opacity-20" quantity={60} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-30" width={32} height={32} cx={16} cy={16} cr={1} />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative flex size-20 items-center justify-center rounded-[2rem] border border-white/[0.08] bg-stone-900/60 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-transparent" />
          <IconBrainstorm className="size-9 animate-pulse text-amber-500/50" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight text-stone-200">Loading shared brainstorm…</p>
          <p className="mt-1 text-sm text-stone-500">Fetching the latest session data</p>
        </div>
      </div>
    </main>
  )
}

function ShareErrorState({ message }: { message: string }) {
  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] font-sans text-stone-100">
      <Particles className="absolute inset-0 z-0 opacity-20" quantity={60} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-30" width={32} height={32} cx={16} cy={16} cr={1} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-[2rem] border border-rose-500/20 bg-rose-500/[0.06] shadow-2xl">
          <AlertCircle className="size-9 text-rose-400/60" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-stone-200">Share Unavailable</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
            {message.includes('404') || message.includes('not found') || message.includes('expired')
              ? 'This brainstorm share link is no longer valid. The session may have been deleted by its owner.'
              : message}
          </p>
        </div>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-white/[0.08]"
        >
          <ArrowLeft className="size-4" />
          Back to Voidpilot
        </Link>
      </div>
    </main>
  )
}

const AI_STYLE = {
  bubble: 'border border-white/[0.06] bg-stone-900/60 text-stone-200',
  label: 'text-amber-500/60',
  name: 'Gemini',
  isMarkdown: true,
}

const AI_VOICE_STYLE = {
  ...AI_STYLE,
  isMarkdown: false,
}

const MESSAGE_STYLES: Record<string, { bubble: string; label: string; name: string; isMarkdown?: boolean }> = {
  user: {
    bubble: 'bg-amber-600/15 text-amber-50',
    label: 'text-amber-400/60',
    name: 'You',
  },
  user_voice: {
    bubble: 'bg-amber-600/15 text-amber-50',
    label: 'text-amber-400/60',
    name: 'You',
    isMarkdown: false,
  },
  system: {
    bubble: 'border border-white/[0.06] bg-white/[0.02] text-stone-500 italic',
    label: 'text-stone-600',
    name: 'System',
  },
  model: AI_STYLE,
  gemini: AI_STYLE,
  gemini_voice: AI_VOICE_STYLE,
}

const LABEL_CLASSES = 'mb-1 text-[10px] font-bold uppercase tracking-[0.2em]'

function PublicMessageBubble({ turn }: { turn: PublicShareTurn }) {
  const isUser = turn.role === 'user' || turn.role === 'user_voice'
  const styles = MESSAGE_STYLES[turn.role] ?? MESSAGE_STYLES.model

  if (turn.isToolResponse) {
    return (
      <div className="flex justify-start">
        <div className="rainbow-border max-w-[90%] rounded-2xl p-[2px] md:max-w-[80%]">
          <div className="rounded-[14px] bg-stone-950 px-4 py-3 text-sm leading-relaxed text-stone-200">
            <div className={`${LABEL_CLASSES} ${AI_STYLE.label}`}>Gemini — Tool Result</div>
            {styles.isMarkdown ? (
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:border prose-pre:border-white/10 prose-pre:bg-stone-900/50">
                <ReactMarkdown>{turn.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{turn.content}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[80%]', styles.bubble)}>
        <div className={cn(LABEL_CLASSES, styles.label)}>{styles.name}</div>
        {styles.isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none prose-a:text-amber-500 prose-p:leading-relaxed prose-pre:border prose-pre:border-white/10 prose-pre:bg-stone-900/50 hover:prose-a:text-amber-400">
            <ReactMarkdown>{turn.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">{turn.content}</div>
        )}
      </div>
    </div>
  )
}

function PublicArtifactCard({
  artifact,
  shareToken,
  isSelected,
  onSelect,
}: {
  artifact: PublicShareArtifact
  shareToken: string
  isSelected: boolean
  onSelect: () => void
}) {
  const isImage = artifact.mimeType.startsWith('image/')
  const isVideo = artifact.mimeType.startsWith('video/')

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        const { blob, filename } = await downloadPublicArtifact(shareToken, artifact.artifactId)
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Failed to download artifact:', error)
      }
    },
    [shareToken, artifact.artifactId],
  )

  return (
    <div
      className={cn(
        'group flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-300',
        isSelected
          ? 'border-amber-500/40 bg-amber-500/[0.08] shadow-[0_0_30px_rgba(217,119,6,0.1)]'
          : 'border-white/[0.06] bg-black/40 hover:border-amber-500/30 hover:bg-amber-500/[0.05]',
      )}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
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
          <div className={cn('truncate text-sm font-semibold', isSelected ? 'text-amber-400' : 'text-stone-200')}>
            {artifact.filename}
          </div>
          {artifact.label && (
            <div className="truncate text-[10px] uppercase tracking-wider text-stone-500">
              {artifact.label}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDownload}
          aria-label="Download artifact"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-stone-400 opacity-0 transition-all hover:bg-white/[0.1] hover:text-white group-hover:opacity-100"
          title="Download"
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function PublicArtifactPreview({
  artifact,
  shareToken,
  onClose,
}: {
  artifact: PublicShareArtifact
  shareToken: string
  onClose: () => void
}) {
  const [content, setContent] = useState<{ data: string; loaded: boolean; key: string }>({ data: '', loaded: false, key: '' })

  const artifactKey = `${shareToken}/${artifact.artifactId}`

  useEffect(() => {
    let cancelled = false

    downloadPublicArtifact(shareToken, artifact.artifactId)
      .then(async ({ blob, mimeType }) => {
        if (cancelled) return
        const isBinary = mimeType.startsWith('image/') || mimeType.startsWith('video/')

        if (isBinary) {
          const buffer = await blob.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i])
          }
          setContent({ data: btoa(binary), loaded: true, key: artifactKey })
        } else {
          const text = await blob.text()
          setContent({ data: text, loaded: true, key: artifactKey })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('Failed to load artifact preview:', error)
          setContent({ data: '', loaded: true, key: artifactKey })
        }
      })

    return () => {
      cancelled = true
    }
  }, [shareToken, artifact.artifactId, artifactKey])

  const isLoading = !content.loaded || content.key !== artifactKey

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-stone-950/40 p-8">
        <p className="text-sm text-stone-500">Loading preview…</p>
      </div>
    )
  }

  const isImage = artifact.mimeType.startsWith('image/')
  const isVideo = artifact.mimeType.startsWith('video/')

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/40 shadow-2xl backdrop-blur-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-stone-950/60 px-6 py-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Preview</span>
          <span className="text-base font-semibold text-amber-400">{artifact.filename}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-9 rounded-xl text-stone-400 hover:bg-white/10"
          title="Close Preview"
        >
          <span className="text-lg font-light leading-none">×</span>
        </Button>
      </div>

      <div className="p-6">
        {isImage && content.data ? (
          <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-stone-950/60 p-2">
            <ShineBorder
              shineColor={['#d97706', '#fbbf24', '#92400e']}
              borderWidth={1}
              duration={12}
            />
            <img
              src={`data:${artifact.mimeType};base64,${content.data}`}
              alt={artifact.label ?? artifact.filename}
              className="max-h-80 w-full rounded-lg object-contain"
            />
            {artifact.label && <p className="mt-2 text-center text-xs text-stone-500">{artifact.label}</p>}
            {artifact.text && (
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-stone-900/50 p-3">
                <div className="prose prose-invert prose-xs max-w-none prose-headings:text-stone-300 prose-p:text-stone-400">
                  <ReactMarkdown>{artifact.text}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : isVideo && content.data ? (
          <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-stone-950/60 p-2">
            <ShineBorder
              shineColor={['#9333ea', '#a855f7', '#7c3aed']}
              borderWidth={1}
              duration={12}
            />
            <video
              src={`data:${artifact.mimeType};base64,${content.data}`}
              controls
              className="max-h-80 w-full rounded-lg"
            />
            {artifact.label && <p className="mt-2 text-center text-xs text-stone-500">{artifact.label}</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-stone-950/40 p-4">
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-stone-200 prose-p:text-stone-400 prose-a:text-amber-400 prose-strong:text-stone-200 prose-code:rounded prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-amber-300 prose-pre:border prose-pre:border-white/[0.06] prose-pre:bg-stone-950 prose-li:text-stone-400 prose-blockquote:border-amber-500/30 prose-blockquote:text-stone-500">
              <ReactMarkdown>{content.data}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
