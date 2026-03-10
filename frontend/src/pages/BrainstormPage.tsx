import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import JSZip from 'jszip'
import { useGeminiBrainstorm } from '../hooks/useGeminiBrainstorm'
import type { BrainstormArtifact } from '../hooks/useGeminiBrainstorm'
import {
  GeminiChat,
  GeminiMicOn,
  GeminiMicOff,
  GeminiSend,
  GeminiStar,
} from '../components/icons/GeminiIcons'
import { IconBrainstorm } from '../components/icons/CustomIcons'
import { StatusChip, MessageBubble } from '../components/SharedUI'

/* ─── Download icon (inline SVG — no animation needed) ─────────────── */

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M6 20h12" />
    </svg>
  )
}

/* ─── File / folder icons ──────────────────────────────────────────── */

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getArtifactSize(artifact: BrainstormArtifact): number {
  if (artifact.mimeType.startsWith('image/')) {
    // Base64 strings are ~33% larger than actual binary — calculate real size
    return Math.floor(artifact.content.length * 3 / 4)
  }
  return new Blob([artifact.content]).size
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadSingleArtifact(artifact: BrainstormArtifact) {
  let blob: Blob
  if (artifact.mimeType.startsWith('image/')) {
    const binary = atob(artifact.content)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    blob = new Blob([bytes], { type: artifact.mimeType })
  } else {
    blob = new Blob([artifact.content], { type: artifact.mimeType })
  }
  downloadBlob(blob, artifact.filename)
}

async function downloadAllArtifacts(artifacts: Map<string, BrainstormArtifact>) {
  const zip = new JSZip()
  for (const [filename, artifact] of artifacts) {
    if (artifact.mimeType.startsWith('image/')) {
      const binary = atob(artifact.content)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      zip.file(filename, bytes)
    } else {
      zip.file(filename, artifact.content)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'brainstorm-artifacts.zip')
}

/* ─── Activity Spinner (Flash Lite generating) ─────────────────────── */

function ActivitySpinner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Generating artifact…
    </div>
  )
}

/* ─── Artifact Preview ─────────────────────────────────────────────── */

function ArtifactPreview({ artifact }: { artifact: BrainstormArtifact }) {
  if (artifact.mimeType === 'image/png') {
    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 p-2">
        <img
          src={`data:image/png;base64,${artifact.content}`}
          alt={artifact.label ?? artifact.filename}
          className="max-h-80 w-full rounded-lg object-contain"
        />
        {artifact.label && (
          <p className="mt-2 text-center text-xs text-slate-500">{artifact.label}</p>
        )}
      </div>
    )
  }

  // Markdown file
  return (
    <div className="overflow-auto rounded-xl border border-white/[0.06] bg-black/20 p-4">
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-a:text-sky-400 prose-strong:text-slate-200 prose-code:text-emerald-300 prose-code:bg-white/5 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-pre:bg-[#0a0e1f] prose-pre:border prose-pre:border-white/[0.06] prose-li:text-slate-300 prose-blockquote:border-sky-500/30 prose-blockquote:text-slate-400">
        <ReactMarkdown>{artifact.content}</ReactMarkdown>
      </div>
    </div>
  )
}

/* ─── Artifact File Row ────────────────────────────────────────────── */

function ArtifactRow({
  artifact,
  isSelected,
  onSelect,
}: {
  artifact: BrainstormArtifact
  isSelected: boolean
  onSelect: () => void
}) {
  const isImage = artifact.mimeType === 'image/png'
  const size = getArtifactSize(artifact)

  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all focus-visible:border-sky-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 ${
        isSelected
          ? 'border-sky-500/30 bg-sky-500/10'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
      }`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
      aria-label={`Select ${artifact.filename}`}
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 shrink-0 text-violet-400" />
      ) : (
        <FileIcon className="h-4 w-4 shrink-0 text-sky-400" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{artifact.filename}</div>
        <div className="text-[10px] text-slate-500">{formatFileSize(size)}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          downloadSingleArtifact(artifact)
        }}
        aria-label={`Download ${artifact.filename}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition-all hover:bg-white/[0.06] hover:text-slate-300 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 group-hover:opacity-100"
        title="Download"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ─── Main BrainstormPage ──────────────────────────────────────────── */

export default function BrainstormPage() {
  const {
    isConnected,
    isStarting,
    messages,
    artifacts,
    isGenerating,
    start,
    stop,
    sendText,
    sendSnapshot,
  } = useGeminiBrainstorm()

  const [inputText, setInputText] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      sendText(inputText)
      setInputText('')
    }
  }, [inputText, sendText])

  const handleConnect = useCallback(async () => {
    try {
      await start()
    } catch {
      // Error is handled inside the hook (addMessage)
    }
  }, [start])

  // Workspace stats
  const artifactList = Array.from(artifacts.entries())
  const totalSize = artifactList.reduce(
    (acc, [, artifact]) => acc + getArtifactSize(artifact),
    0,
  )

  const currentArtifact =
    selectedArtifact !== null ? artifacts.get(selectedArtifact) ?? null : null

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#060818] text-slate-100">
      {/* ═══════ Top bar ═══════ */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0e1f]/80 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <IconBrainstorm className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Brainstorm <span className="text-amber-400">Mode</span>
          </span>
        </div>

        <StatusChip isConnected={isConnected} isStarting={isStarting} />
      </header>

      {/* ═══════ Body (2-column split) ═══════ */}
      <div className="flex min-h-0 flex-1">
        {/* ─── Left Panel (~60%): Conversation ─── */}
        <div className="flex min-w-0 flex-[3] flex-col border-r border-white/[0.06]">
          {/* Chat header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080c1c]/40 px-5 py-3">
            <GeminiChat className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Conversation</span>
            <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-slate-500">
              {messages.length} messages
            </span>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                  <IconBrainstorm className="h-7 w-7 text-amber-500/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Ready to brainstorm</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Connect and start talking — Gemini will help develop your ideas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <MessageBubble key={index} role={message.role} content={message.content} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar + controls */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#080c1c]/40 px-5 py-3.5">
            {/* Text input */}
            <div className="flex gap-2.5">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                placeholder={isConnected ? 'Type a message…' : 'Connect first to chat'}
                disabled={!isConnected}
                aria-label="Message input"
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/40 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!isConnected || !inputText.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-sky-600/80 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <GeminiSend className="h-4 w-4" />
              </button>
            </div>

            {/* Action buttons row */}
            <div className="mt-3 flex items-center gap-3">
              {/* Connect / Disconnect */}
              {!isConnected ? (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isStarting}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(56,189,248,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(56,189,248,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <GeminiMicOn className="h-4 w-4" />
                  {isStarting ? 'Connecting…' : 'Start Brainstorm'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stop}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(225,29,72,0.25)] transition-all hover:bg-rose-500"
                >
                  <GeminiMicOff className="h-4 w-4" />
                  End Session
                </button>
              )}

              {/* Save Snapshot */}
              <button
                type="button"
                onClick={sendSnapshot}
                disabled={!isConnected}
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <GeminiStar className="h-4 w-4" />
                Save Snapshot
              </button>
            </div>
          </div>
        </div>

        {/* ─── Right Panel (~40%): Artifact Workspace ─── */}
        <div className="flex min-w-0 flex-[2] flex-col bg-[#080c1c]/60">
          {/* Workspace header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080c1c]/40 px-5 py-3">
            <FileIcon className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold text-white">Workspace</span>
            {artifactList.length > 0 && (
              <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-slate-500">
                {artifactList.length} {artifactList.length === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)}
              </span>
            )}
          </div>

          {/* Session warning banner */}
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Artifacts are stored in your session. Download before disconnecting.
          </div>

          {/* Flash Lite activity spinner */}
          {isGenerating && (
            <div className="mx-4 mt-3">
              <ActivitySpinner />
            </div>
          )}

          {/* Main workspace content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
            {artifactList.length === 0 ? (
              /* Empty state */
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                  <GeminiStar className="h-6 w-6 text-sky-500/30" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">No artifacts yet</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Start brainstorming — artifacts will appear here
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* File list */}
                <div className="flex flex-col gap-2">
                  {artifactList.map(([filename, artifact]) => (
                    <ArtifactRow
                      key={filename}
                      artifact={artifact}
                      isSelected={selectedArtifact === filename}
                      onSelect={() =>
                        setSelectedArtifact((prev) =>
                          prev === filename ? null : filename,
                        )
                      }
                    />
                  ))}
                </div>

                {/* Inline preview */}
                {currentArtifact && (
                  <div className="mt-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Preview — {currentArtifact.filename}
                    </div>
                    <ArtifactPreview artifact={currentArtifact} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Download All button */}
          {artifactList.length > 0 && (
            <div className="shrink-0 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => downloadAllArtifacts(artifacts)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition-all hover:bg-sky-500/20"
              >
                <DownloadIcon className="h-4 w-4" />
                Download All ({artifactList.length} {artifactList.length === 1 ? 'file' : 'files'})
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
