import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import ReactMarkdown from 'react-markdown'
import JSZip from 'jszip'
import {
  BRAINSTORM_FLASH_MODEL_OPTIONS,
  type BrainstormArtifact,
  type BrainstormFlashModel,
} from '../../hooks/useGeminiBrainstorm'
import type { Message } from '../../hooks/useGeminiLive'
import {
  GeminiChat,
  GeminiMicOff,
  GeminiMicOn,
  GeminiSend,
  GeminiStar,
} from '../icons/GeminiIcons'
import { IconBrainstorm } from '../icons/CustomIcons'
import { MessageBubble, StatusChip } from '../SharedUI'

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getArtifactSize(artifact: BrainstormArtifact): number {
  if (artifact.mimeType.startsWith('image/')) {
    return Math.floor((artifact.content.length * 3) / 4)
  }
  return new Blob([artifact.content]).size
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function artifactToBlob(artifact: BrainstormArtifact): Blob {
  if (artifact.mimeType.startsWith('image/')) {
    const binary = atob(artifact.content)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], { type: artifact.mimeType })
  }

  return new Blob([artifact.content], { type: artifact.mimeType })
}

function downloadSingleArtifact(artifact: BrainstormArtifact) {
  downloadBlob(artifactToBlob(artifact), artifact.filename)
}

async function downloadAllArtifacts(artifacts: Map<string, BrainstormArtifact>) {
  const zip = new JSZip()

  for (const [filename, artifact] of artifacts) {
    if (artifact.mimeType.startsWith('image/')) {
      const binary = atob(artifact.content)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      zip.file(filename, bytes)
    } else {
      zip.file(filename, artifact.content)
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'brainstorm-artifacts.zip')
}

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

function ArtifactPreview({ artifact }: { artifact: BrainstormArtifact }) {
  if (artifact.mimeType === 'image/png') {
    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 p-2">
        <img
          src={`data:image/png;base64,${artifact.content}`}
          alt={artifact.label ?? artifact.filename}
          className="max-h-80 w-full rounded-lg object-contain"
        />
        {artifact.label && <p className="mt-2 text-center text-xs text-slate-500">{artifact.label}</p>}
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-xl border border-white/[0.06] bg-black/20 p-4">
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-a:text-sky-400 prose-strong:text-slate-200 prose-code:rounded prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-emerald-300 prose-pre:border prose-pre:border-white/[0.06] prose-pre:bg-[#0a0e1f] prose-li:text-slate-300 prose-blockquote:border-sky-500/30 prose-blockquote:text-slate-400">
        <ReactMarkdown>{artifact.content}</ReactMarkdown>
      </div>
    </div>
  )
}

function ArtifactRow({
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
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
        isSelected
          ? 'border-sky-500/30 bg-sky-500/10'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
      }`}
      onClick={onSelect}
      onKeyDown={(event) => event.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
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
        onClick={(event) => {
          event.stopPropagation()
          downloadSingleArtifact(artifact)
        }}
        aria-label="Download artifact"
        className={
          downloadButtonClassName ??
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition-all hover:bg-white/[0.06] hover:text-slate-300 group-hover:opacity-100'
        }
        title="Download"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

type BrainstormControlsProps = {
  isConnected: boolean
  isStarting: boolean
  selectedFlashModel: BrainstormFlashModel
  setSelectedFlashModel: Dispatch<SetStateAction<BrainstormFlashModel>>
  inputText: string
  setInputText: (value: string) => void
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  sendSnapshot: () => void
  layout: 'desktop' | 'mobile'
}

function BrainstormControls({
  isConnected,
  isStarting,
  selectedFlashModel,
  setSelectedFlashModel,
  inputText,
  setInputText,
  handleSend,
  handleConnect,
  stop,
  sendSnapshot,
  layout,
}: BrainstormControlsProps) {
  const isMobile = layout === 'mobile'

  return (
    <>
      <div className={isMobile ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]' : 'mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]'}>
        <label
          className={
            isMobile
              ? 'order-2 flex min-h-12 flex-col justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-medium text-slate-300 lg:order-1'
              : 'flex min-h-11 flex-col justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300'
          }
        >
          <span className="mb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Flash worker model</span>
          <select
            value={selectedFlashModel}
            onChange={(event) => setSelectedFlashModel(event.target.value as BrainstormFlashModel)}
            disabled={isConnected || isStarting}
            aria-label="Flash worker model"
            className={
              isMobile
                ? 'min-h-11 cursor-pointer rounded-xl border border-white/[0.08] bg-[#0b1120] px-3 text-sm text-white outline-none transition-colors focus:border-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50'
                : 'min-h-11 cursor-pointer rounded-lg border border-white/[0.08] bg-[#0b1120] px-3 text-sm text-white outline-none transition-colors focus:border-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {BRAINSTORM_FLASH_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className={isMobile ? 'order-1 flex flex-col gap-3 sm:flex-row lg:order-2' : 'flex items-center gap-3'}>
          {!isConnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isStarting}
              className={
                isMobile
                  ? 'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(56,189,248,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(56,189,248,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none'
                  : 'flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(56,189,248,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(56,189,248,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none'
              }
            >
              <GeminiMicOn className="h-4 w-4" />
              {isStarting ? 'Connecting…' : 'Start Brainstorm'}
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className={
                isMobile
                  ? 'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(225,29,72,0.25)] transition-all hover:bg-rose-500'
                  : 'flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_32px_rgba(225,29,72,0.25)] transition-all hover:bg-rose-500'
              }
            >
              <GeminiMicOff className="h-4 w-4" />
              End Session
            </button>
          )}

          <button
            type="button"
            onClick={sendSnapshot}
            disabled={!isConnected}
            className={
              isMobile
                ? 'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-30'
                : 'flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-30'
            }
          >
            <GeminiStar className="h-4 w-4" />
            Save Snapshot
          </button>
        </div>
      </div>

      <div className={isMobile ? 'mt-3 rounded-2xl border border-white/[0.06] bg-[#080c1c]/70 p-2' : ''}>
        <div className={isMobile ? 'flex gap-2' : 'flex gap-2.5'}>
          <input
            type="text"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder={isConnected ? 'Type a message…' : 'Connect first to chat'}
            disabled={!isConnected}
            aria-label="Message input"
            className={
              isMobile
                ? 'min-h-11 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/40 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40'
                : 'flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/40 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40'
            }
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!isConnected || !inputText.trim()}
            aria-label="Send message"
            className={
              isMobile
                ? 'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-sky-600/80 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-30'
                : 'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-sky-600/80 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-30'
            }
          >
            <GeminiSend className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

type ConversationPanelProps = {
  messages: Message[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  mobile: boolean
}

function ConversationPanel({ messages, messagesEndRef, mobile }: ConversationPanelProps) {
  return (
    <>
      <div className={mobile ? 'flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 py-4' : 'flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080c1c]/40 px-5 py-3'}>
        <GeminiChat className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Conversation</span>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-slate-500">
          {messages.length} messages
        </span>
      </div>

      <div className={mobile ? 'min-h-0 flex-1 overflow-y-auto px-4 py-4' : 'flex-1 overflow-y-auto px-5 py-4'}>
        {messages.length === 0 ? (
          <div className={mobile ? 'flex h-full flex-col items-center justify-center gap-4 py-10 text-center' : 'flex h-full flex-col items-center justify-center gap-4 text-center'}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <IconBrainstorm className="h-7 w-7 text-amber-500/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Ready to brainstorm</p>
              <p className={mobile ? 'mt-1 text-sm leading-6 text-slate-500' : 'mt-1 text-xs text-slate-600'}>
                {mobile
                  ? 'Connect and start talking. Gemini will help shape ideas and create assets.'
                  : 'Connect and start talking — Gemini will help develop your ideas.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                role={message.role}
                content={message.content}
                isToolResponse={message.isToolResponse}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </>
  )
}

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

function WorkspacePanel({
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
      <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/[0.06] bg-[#080c1c]/60 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="shrink-0 border-b border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold text-white">Workspace</span>
            {artifactList.length > 0 && (
              <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-slate-500">
                {artifactList.length} {artifactList.length === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)}
              </span>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-300">
            Artifacts stay in this session only. Download anything you want to keep before disconnecting.
          </div>

          {isGenerating && (
            <div className="mt-3">
              <ActivitySpinner />
            </div>
          )}

          {artifactList.length > 0 && (
            <button
              type="button"
              onClick={() => downloadAllArtifacts(artifacts)}
              className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition-all hover:bg-sky-500/20"
            >
              <DownloadIcon className="h-4 w-4" />
              Download All ({artifactList.length} {artifactList.length === 1 ? 'file' : 'files'})
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {artifactList.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <GeminiStar className="h-6 w-6 text-sky-500/30" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">No artifacts yet</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
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
                    downloadButtonClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-slate-300 transition-all hover:bg-white/[0.08]"
                  />
                ))}
              </div>

              {currentArtifact ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Preview — {currentArtifact.filename}
                  </div>
                  <ArtifactPreview artifact={currentArtifact} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-sm leading-6 text-slate-500">
                  Tap an artifact to preview it here.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="flex min-w-0 flex-[2] flex-col bg-[#080c1c]/60">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080c1c]/40 px-5 py-3">
        <FileIcon className="h-4 w-4 text-sky-400" />
        <span className="text-sm font-semibold text-white">Workspace</span>
        {artifactList.length > 0 && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-slate-500">
            {artifactList.length} {artifactList.length === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)}
          </span>
        )}
      </div>

      <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Artifacts are stored in your session. Download before disconnecting.
      </div>

      {isGenerating && (
        <div className="mx-4 mt-3">
          <ActivitySpinner />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
        {artifactList.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <GeminiStar className="h-6 w-6 text-sky-500/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">No artifacts yet</p>
              <p className="mt-1 text-xs text-slate-600">Start brainstorming — artifacts will appear here</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {artifactList.map(([filename, artifact]) => (
                <ArtifactRow
                  key={filename}
                  artifact={artifact}
                  isSelected={selectedArtifact === filename}
                  onSelect={() => selectArtifact(filename)}
                />
              ))}
            </div>

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
  )
}

export type BrainstormLayoutProps = {
  isConnected: boolean
  isStarting: boolean
  messages: Message[]
  artifacts: Map<string, BrainstormArtifact>
  artifactList: Array<[string, BrainstormArtifact]>
  totalSize: number
  isGenerating: boolean
  inputText: string
  selectedArtifact: string | null
  currentArtifact: BrainstormArtifact | null
  selectedFlashModel: BrainstormFlashModel
  setSelectedFlashModel: Dispatch<SetStateAction<BrainstormFlashModel>>
  messagesEndRef: RefObject<HTMLDivElement | null>
  setInputText: (value: string) => void
  setSelectedArtifact: Dispatch<SetStateAction<string | null>>
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  sendSnapshot: () => void
}

export function BrainstormDesktopLayout({
  isConnected,
  isStarting,
  messages,
  artifacts,
  artifactList,
  totalSize,
  isGenerating,
  inputText,
  selectedArtifact,
  currentArtifact,
  selectedFlashModel,
  setSelectedFlashModel,
  messagesEndRef,
  setInputText,
  setSelectedArtifact,
  handleSend,
  handleConnect,
  stop,
  sendSnapshot,
}: BrainstormLayoutProps) {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#060818] text-slate-100">
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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-[3] flex-col border-r border-white/[0.06]">
          <ConversationPanel messages={messages} messagesEndRef={messagesEndRef} mobile={false} />

          <div className="shrink-0 border-t border-white/[0.06] bg-[#080c1c]/40 px-5 py-3.5">
            <BrainstormControls
              isConnected={isConnected}
              isStarting={isStarting}
              selectedFlashModel={selectedFlashModel}
              setSelectedFlashModel={setSelectedFlashModel}
              inputText={inputText}
              setInputText={setInputText}
              handleSend={handleSend}
              handleConnect={handleConnect}
              stop={stop}
              sendSnapshot={sendSnapshot}
              layout="desktop"
            />
          </div>
        </div>

        <WorkspacePanel
          artifacts={artifacts}
          artifactList={artifactList}
          totalSize={totalSize}
          isGenerating={isGenerating}
          selectedArtifact={selectedArtifact}
          currentArtifact={currentArtifact}
          setSelectedArtifact={setSelectedArtifact}
          mobile={false}
        />
      </div>
    </main>
  )
}

export function BrainstormMobileLayout({
  isConnected,
  isStarting,
  messages,
  artifacts,
  artifactList,
  totalSize,
  isGenerating,
  inputText,
  selectedArtifact,
  currentArtifact,
  selectedFlashModel,
  setSelectedFlashModel,
  messagesEndRef,
  setInputText,
  setSelectedArtifact,
  handleSend,
  handleConnect,
  stop,
  sendSnapshot,
}: BrainstormLayoutProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'workspace'>('chat')

  useEffect(() => {
    if (artifactList.length > 0) {
      setSelectedArtifact((previous) => previous ?? artifactList[0][0])
    }
  }, [artifactList, setSelectedArtifact])

  return (
    <main className="flex min-h-dvh flex-col bg-[#060818] text-slate-100">
      <header className="sticky top-0 z-20 shrink-0 border-b border-white/[0.06] bg-[#0a0e1f]/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_12px_32px_rgba(249,115,22,0.25)]">
                <IconBrainstorm className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400/80">Brainstorm</p>
                <h1 className="truncate text-lg font-semibold text-white">Mobile workspace</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Chat, save snapshots, and review artifacts without the desktop split view.
            </p>
          </div>
          <StatusChip isConnected={isConnected} isStarting={isStarting} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-4 text-sm font-semibold transition-colors ${
              activeTab === 'chat'
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <GeminiChat className="h-4 w-4" />
            Chat
            <span className="text-xs text-slate-500">{messages.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-4 text-sm font-semibold transition-colors ${
              activeTab === 'workspace'
                ? 'bg-violet-500/20 text-violet-200'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <FileIcon className="h-4 w-4" />
            Workspace
            <span className="text-xs text-slate-500">{artifactList.length}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        {activeTab === 'chat' ? (
          <>
            <section className="shrink-0 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
              <BrainstormControls
                isConnected={isConnected}
                isStarting={isStarting}
                selectedFlashModel={selectedFlashModel}
                setSelectedFlashModel={setSelectedFlashModel}
                inputText={inputText}
                setInputText={setInputText}
                handleSend={handleSend}
                handleConnect={handleConnect}
                stop={stop}
                sendSnapshot={sendSnapshot}
                layout="mobile"
              />
            </section>

            <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/[0.06] bg-[#080c1c]/60 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
              <ConversationPanel messages={messages} messagesEndRef={messagesEndRef} mobile />
            </section>
          </>
        ) : (
          <WorkspacePanel
            artifacts={artifacts}
            artifactList={artifactList}
            totalSize={totalSize}
            isGenerating={isGenerating}
            selectedArtifact={selectedArtifact}
            currentArtifact={currentArtifact}
            setSelectedArtifact={setSelectedArtifact}
            mobile
          />
        )}
      </div>
    </main>
  )
}