import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  MessageSquareText,
  Mic,
  MicOff,
  Monitor,
  MoveDiagonal,
  Radio,
  ScanSearch,
  Send,
  ShieldAlert,
  Sparkles,
  Terminal,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'
import type { PendingBashRequest } from './hooks/useGeminiLive'
import type { DesktopCapturerSource, RegionBounds } from './electron-env'

type ShareMode = 'full' | 'region'

function formatRegion(region?: RegionBounds) {
  if (!region) return 'No area selected yet'
  return `${region.width}×${region.height} at (${region.x}, ${region.y})`
}

function formatPixels(width: number, height: number) {
  return `${width.toLocaleString()}×${height.toLocaleString()}`
}

function getNativeResolution(source: DesktopCapturerSource) {
  return {
    width: Math.round(source.bounds.width * source.scaleFactor),
    height: Math.round(source.bounds.height * source.scaleFactor),
  }
}

function PulseRing({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
  )
}

function StatusChip({ isConnected, isStarting }: { isConnected: boolean; isStarting: boolean }) {
  let colorClasses: string
  let label: string

  if (isConnected) {
    colorClasses = 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
    label = 'Live'
  } else if (isStarting) {
    colorClasses = 'border border-amber-400/20 bg-amber-500/10 text-amber-300'
    label = 'Starting…'
  } else {
    colorClasses = 'border border-white/10 bg-white/5 text-slate-400'
    label = 'Offline'
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors ${colorClasses}`}
    >
      <PulseRing active={isConnected} />
      {label}
    </div>
  )
}

const MESSAGE_STYLES: Record<string, { bubble: string; label: string; name: string }> = {
  user: {
    bubble: 'bg-sky-600/20 text-sky-100',
    label: 'text-sky-400/60',
    name: 'You',
  },
  system: {
    bubble: 'border border-white/[0.06] bg-white/[0.03] text-slate-500 italic',
    label: 'text-slate-600',
    name: 'System',
  },
  model: {
    bubble: 'border border-white/[0.06] bg-white/[0.04] text-slate-200',
    label: 'text-indigo-400/60',
    name: 'Gemini',
  },
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user'
  const styles = MESSAGE_STYLES[role] ?? MESSAGE_STYLES.model
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${styles.bubble}`}>
        <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${styles.label}`}>
          {styles.name}
        </div>
        <div>{content}</div>
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        <Icon className={`h-3 w-3 ${iconColor}`} />
        {title}
      </div>
      <div className="mt-2 text-sm text-slate-300">{children}</div>
    </div>
  )
}

function BashConfirmPopup({
  request,
  onAllow,
  onDeny,
}: {
  request: PendingBashRequest
  onAllow: () => void
  onDeny: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1229] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-amber-500/[0.06] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Command Confirmation</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Gemini wants to run this command on your computer
            </p>
          </div>
          <button
            type="button"
            onClick={onDeny}
            className="ml-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command display */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Terminal className="h-3 w-3 text-sky-400" />
            Command
          </div>
          <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#060818] px-4 py-3">
            <code className="break-all text-sm font-mono text-emerald-300">
              {request.command}
            </code>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            You can also say <span className="font-medium text-slate-300">"yes"</span> or{' '}
            <span className="font-medium text-slate-300">"go ahead"</span> to approve, or{' '}
            <span className="font-medium text-slate-300">"no"</span> /{' '}
            <span className="font-medium text-slate-300">"cancel"</span> to deny.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <button
            type="button"
            onClick={onDeny}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
            Deny
          </button>
          <button
            type="button"
            onClick={onAllow}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
          >
            <CheckCircle2 className="h-4 w-4" />
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { isConnected, isStarting, messages, start, stop, sendText, pendingBash, confirmBash, denyBash } =
    useGeminiLive()
  const [inputText, setInputText] = useState('')
  const [screenShareEnabled, setScreenShareEnabled] = useState(true)
  const [sources, setSources] = useState<DesktopCapturerSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>('full')
  const [selectedRegion, setSelectedRegion] = useState<RegionBounds | null>(null)
  const [isPickingRegion, setIsPickingRegion] = useState(false)
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [showDisplayPicker, setShowDisplayPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load displays on mount
  useEffect(() => {
    let isMounted = true

    async function loadSources() {
      if (!window.electronAPI?.getDesktopSources) {
        setSetupError('Electron desktop source API is unavailable.')
        setIsLoadingSources(false)
        return
      }

      try {
        const availableSources = await window.electronAPI.getDesktopSources()
        if (!isMounted) return

        setSources(availableSources)
        const defaultSource = availableSources.find((source) => source.isPrimary) ?? availableSources[0]
        if (defaultSource) {
          setSelectedSourceId(defaultSource.id)
        }
      } catch (error) {
        if (!isMounted) return
        setSetupError((error as Error).message)
      } finally {
        if (isMounted) {
          setIsLoadingSources(false)
        }
      }
    }

    loadSources()
    return () => {
      isMounted = false
    }
  }, [])

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  )

  const nativeResolution = useMemo(
    () => (selectedSource ? getNativeResolution(selectedSource) : null),
    [selectedSource],
  )

  useEffect(() => {
    setSelectedRegion(null)
  }, [selectedSourceId, shareMode])

  const handleSend = () => {
    if (inputText.trim()) {
      sendText(inputText)
      setInputText('')
    }
  }

  const handlePickRegion = async () => {
    if (!selectedSource || !window.electronAPI?.openRegionSelector) return

    setSetupError(null)
    setIsPickingRegion(true)
    try {
      const result = await window.electronAPI.openRegionSelector(selectedSource)
      if (result) {
        setSelectedRegion(result.region)
      }
    } catch (error) {
      setSetupError((error as Error).message)
    } finally {
      setIsPickingRegion(false)
    }
  }

  const handleStart = async () => {
    if (screenShareEnabled) {
      if (!selectedSource || !window.electronAPI?.setMidsceneDisplay) return
      if (shareMode === 'region' && !selectedRegion) {
        setSetupError('Choose a region before starting a partial display share.')
        return
      }
    }

    setSetupError(null)

    try {
      if (screenShareEnabled && selectedSource && window.electronAPI?.setMidsceneDisplay) {
        await window.electronAPI.setMidsceneDisplay(selectedSource.displayId)
        await start({
          source: selectedSource,
          shareMode,
          region: shareMode === 'region' ? selectedRegion ?? undefined : undefined,
        })
      } else {
        await start()
      }
    } catch (error) {
      setSetupError((error as Error).message)
    }
  }

  const canStart =
    !isConnected &&
    !isStarting &&
    !isPickingRegion &&
    (!screenShareEnabled || (!!selectedSource && (shareMode === 'full' || Boolean(selectedRegion))))

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#060818] text-slate-100">
      {/* ═══════ Top bar ═══════ */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0e1f]/80 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Gemini Desktop <span className="text-sky-400">Bridge</span>
          </span>
        </div>

        <StatusChip isConnected={isConnected} isStarting={isStarting} />
      </header>

      {/* ═══════ Body (2-column) ═══════ */}
      <div className="flex min-h-0 flex-1">
        {/* ─── Left: Controls ─── */}
        <div className="flex w-[380px] shrink-0 flex-col gap-0 overflow-y-auto border-r border-white/[0.06] bg-[#080c1c]/60">

          {/* ── Screen sharing toggle ── */}
          <section className="border-b border-white/[0.06] p-4">
            <button
              type="button"
              onClick={() => !isConnected && setScreenShareEnabled(!screenShareEnabled)}
              disabled={isConnected}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                screenShareEnabled
                  ? 'border-sky-500/20 bg-sky-500/[0.07]'
                  : 'border-white/[0.08] bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    screenShareEnabled ? 'bg-sky-500/15' : 'bg-white/[0.06]'
                  }`}
                >
                  {screenShareEnabled ? (
                    <Eye className="h-4 w-4 text-sky-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Screen Sharing</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {screenShareEnabled ? 'Gemini can see your screen' : 'Audio-only mode'}
                  </div>
                </div>
              </div>
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  screenShareEnabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    screenShareEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </section>

          {screenShareEnabled && (
            <>
          {/* ── Display selector ── */}
          <section className="border-b border-white/[0.06] p-4">
            <button
              type="button"
              onClick={() => setShowDisplayPicker(!showDisplayPicker)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
                  <Monitor className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Display
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-white">
                    {isLoadingSources
                      ? 'Scanning…'
                      : selectedSource?.name ?? 'No display found'}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${showDisplayPicker ? 'rotate-180' : ''}`}
              />
            </button>

            {showDisplayPicker && (
              <div className="mt-3 flex flex-col gap-2">
                {sources.map((source) => {
                  const isSelected = source.id === selectedSourceId
                  const native = getNativeResolution(source)
                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => {
                        setSelectedSourceId(source.id)
                        setShowDisplayPicker(false)
                      }}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        isSelected
                          ? 'border-sky-500/30 bg-sky-500/10'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full border-2 transition-colors ${
                          isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-600 bg-transparent'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-white">{source.name}</span>
                          {source.isPrimary && (
                            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatPixels(native.width, native.height)} · {source.scaleFactor}x
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Share mode ── */}
          <section className="border-b border-white/[0.06] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <ScanSearch className="h-3.5 w-3.5 text-orange-400" />
              Capture mode
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: 'full' as ShareMode, label: 'Full screen', icon: Monitor },
                { mode: 'region' as ShareMode, label: 'Region', icon: MoveDiagonal },
              ].map(({ mode, label, icon: Icon }) => {
                const isActive = shareMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setShareMode(mode)}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'border-orange-400/30 bg-orange-500/10 text-orange-200'
                        : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                    {label}
                  </button>
                )
              })}
            </div>

            {shareMode === 'region' && (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400">
                      {selectedRegion ? formatRegion(selectedRegion) : 'No region selected'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePickRegion}
                    disabled={!selectedSource || isPickingRegion || isConnected}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <WandSparkles className="h-3.5 w-3.5" />
                    {isPickingRegion ? 'Picking…' : selectedRegion ? 'Re-pick' : 'Select area'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3 p-4">
            <InfoCard icon={Activity} iconColor="text-sky-400" title="Display info">
              {nativeResolution && selectedSource
                ? `${formatPixels(nativeResolution.width, nativeResolution.height)} native · ${formatPixels(selectedSource.bounds.width, selectedSource.bounds.height)} logical`
                : 'Select a display'}
            </InfoCard>

            <InfoCard icon={Radio} iconColor="text-orange-400" title="Gemini sees">
              {shareMode === 'full'
                ? selectedSource
                  ? `Full feed from ${selectedSource.name}`
                  : 'Waiting for display'
                : selectedRegion
                  ? formatRegion(selectedRegion)
                  : 'Region not yet defined'}
            </InfoCard>

            <InfoCard icon={Zap} iconColor="text-emerald-400" title="Midscene target">
              {selectedSource?.name ?? 'None'}
            </InfoCard>
          </section>
            </>
          )}

          {/* ── Error ── */}
          {setupError && (
            <div className="mx-4 mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              {setupError}
            </div>
          )}

          {/* ── Start / Stop ── */}
          <div className="mt-auto border-t border-white/[0.06] p-4">
            {!isConnected ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_32px_rgba(56,189,248,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(56,189,248,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <Mic className="h-4 w-4" />
                {isStarting ? 'Connecting…' : 'Start Live Session'}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-rose-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_32px_rgba(225,29,72,0.25)] transition-all hover:bg-rose-500"
              >
                <MicOff className="h-4 w-4" />
                End Session
              </button>
            )}
          </div>
        </div>

        {/* ─── Right: Conversation ─── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Chat header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080c1c]/40 px-5 py-3">
            <MessageSquareText className="h-4 w-4 text-sky-400" />
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
                  <Sparkles className="h-7 w-7 text-sky-500/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">No messages yet</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Start a session to begin talking with Gemini.
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

          {/* Input bar */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#080c1c]/40 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/40" />
                Quick prompt
              </div>
            </div>
            <div className="mt-2.5 flex gap-2.5">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                placeholder={isConnected ? 'Type a message…' : 'Connect first to chat'}
                disabled={!isConnected}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500/40 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!isConnected || !inputText.trim()}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-sky-600/80 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bash confirmation popup */}
      {pendingBash && (
        <BashConfirmPopup request={pendingBash} onAllow={confirmBash} onDeny={denyBash} />
      )}
    </main>
  )
}
