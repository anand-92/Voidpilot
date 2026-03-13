import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, FileText, ImageIcon, Video, ArrowLeft, Share2, AlertCircle } from 'lucide-react'
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
  const selectedArtifactData = selectedArtifact
    ? artifacts.find((a) => a.artifactId === selectedArtifact) ?? null
    : null

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] font-sans text-stone-100">
      <Particles className="absolute inset-0 z-0 opacity-30" quantity={80} ease={80} color="#fbbf24" refresh />
      <DotPattern className="absolute inset-0 z-0 opacity-40" width={32} height={32} cx={16} cy={16} cr={1} />

      {/* Header */}
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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <IconBrainstorm className="size-4 text-amber-500" />
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

        <Badge
          variant="outline"
          className="shrink-0 gap-1.5 border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400/80"
        >
          <Share2 className="size-3" />
          Shared
        </Badge>
      </header>

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

const MESSAGE_STYLES: Record<string, { bubble: string; label: string; name: string; isMarkdown?: boolean }> = {
  user: {
    bubble: 'bg-amber-600/15 text-amber-50',
    label: 'text-amber-400/60',
    name: 'You',
  },
  system: {
    bubble: 'border border-white/[0.06] bg-white/[0.02] text-stone-500 italic',
    label: 'text-stone-600',
    name: 'System',
  },
  model: AI_STYLE,
  gemini: AI_STYLE,
}

const LABEL_CLASSES = 'mb-1 text-[10px] font-bold uppercase tracking-[0.2em]'

function PublicMessageBubble({ turn }: { turn: PublicShareTurn }) {
  const isUser = turn.role === 'user'
  const styles = MESSAGE_STYLES[turn.role] ?? MESSAGE_STYLES.model

  if (turn.isToolResponse) {
    return (
      <div className="flex justify-start">
        <div className="rainbow-border max-w-[90%] rounded-2xl p-[2px] md:max-w-[80%]">
          <div className="rounded-[14px] bg-stone-950 px-4 py-3 text-sm leading-relaxed text-stone-200">
            <div className={`${LABEL_CLASSES} ${AI_STYLE.label}`}>Gemini — Tool Result</div>
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:border prose-pre:border-white/10 prose-pre:bg-stone-900/50">
              <ReactMarkdown>{turn.content}</ReactMarkdown>
            </div>
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
