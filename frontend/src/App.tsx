import {
  Activity,
  CheckCircle2,
  MessageSquareText,
  Monitor,
  MoveDiagonal,
  ScanSearch,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'
import type { DesktopCapturerSource, RegionBounds } from './electron-env'

type ShareMode = 'full' | 'region'

function formatRegion(region?: RegionBounds) {
  if (!region) return 'No area selected yet'
  return `${region.width} x ${region.height} at ${region.x}, ${region.y}`
}

function formatPixels(width: number, height: number) {
  return `${width.toLocaleString()} x ${height.toLocaleString()}`
}

function getNativeResolution(source: DesktopCapturerSource) {
  return {
    width: Math.round(source.bounds.width * source.scaleFactor),
    height: Math.round(source.bounds.height * source.scaleFactor),
  }
}

export default function App() {
  const { isConnected, isStarting, messages, start, stop, sendText } = useGeminiLive()
  const [inputText, setInputText] = useState('')
  const [sources, setSources] = useState<DesktopCapturerSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>('full')
  const [selectedRegion, setSelectedRegion] = useState<RegionBounds | null>(null)
  const [isPickingRegion, setIsPickingRegion] = useState(false)
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)

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

  const sessionState = isConnected ? 'Connected' : isStarting ? 'Starting' : 'Ready to launch'
  const sessionTone = isConnected
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
    : isStarting
      ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
      : 'border-sky-300/25 bg-sky-300/10 text-sky-100'

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
    if (!selectedSource || !window.electronAPI?.setMidsceneDisplay) return
    if (shareMode === 'region' && !selectedRegion) {
      setSetupError('Choose a region before starting a partial display share.')
      return
    }

    setSetupError(null)

    try {
      await window.electronAPI.setMidsceneDisplay(selectedSource.displayId)
      await start({
        source: selectedSource,
        shareMode,
        region: shareMode === 'region' ? selectedRegion ?? undefined : undefined,
      })
    } catch (error) {
      setSetupError((error as Error).message)
    }
  }

  const canStart =
    !isConnected &&
    !isStarting &&
    !!selectedSource &&
    (shareMode === 'full' || Boolean(selectedRegion)) &&
    !isPickingRegion

  return (
    <main className="min-h-screen overflow-y-auto text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(251,146,60,0.12),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_22%)]" />

      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/70 shadow-[0_35px_120px_rgba(2,6,23,0.62)] backdrop-blur-xl">
          <div className="grid gap-6 border-b border-white/8 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.2)_45%,rgba(249,115,22,0.14))] px-5 py-6 sm:px-7 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100">
                <Sparkles className="h-3.5 w-3.5" />
                Gemini desktop bridge
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A cleaner launchpad for live desktop sessions.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/85 sm:text-[15px]">
                Pick the monitor, decide whether Gemini sees the whole display or a focused crop, and start with Midscene locked to that same display. The layout now scrolls naturally and holds up when you resize the app window.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className={`rounded-[26px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${sessionTone}`}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]">
                  <Activity className="h-4 w-4" />
                  Session
                </div>
                <div className="mt-3 text-xl font-semibold">{sessionState}</div>
                <div className="mt-1 text-sm opacity-90">
                  {isConnected ? 'Audio and screen stream are live.' : isStarting ? 'Starting microphone, screen, and websocket...' : 'Waiting for a display and share mode.'}
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-slate-900/65 px-4 py-4 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <Monitor className="h-4 w-4 text-sky-300" />
                  Display
                </div>
                <div className="mt-3 text-lg font-semibold text-white">{selectedSource?.name ?? 'No display selected'}</div>
                <div className="mt-1 text-sm text-slate-300">
                  {nativeResolution && selectedSource
                    ? `${formatPixels(nativeResolution.width, nativeResolution.height)} native • ${formatPixels(selectedSource.bounds.width, selectedSource.bounds.height)} logical`
                    : 'Choose a monitor to see its native and scaled desktop size.'}
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-slate-900/65 px-4 py-4 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <MoveDiagonal className="h-4 w-4 text-orange-300" />
                  Gemini view
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {shareMode === 'full' ? 'Entire display' : selectedRegion ? 'Focused region selected' : 'Region not selected'}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {shareMode === 'full'
                    ? 'Gemini receives the full display feed.'
                    : selectedRegion
                      ? formatRegion(selectedRegion)
                      : 'Open the selection overlay to define the shared area.'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Monitor className="h-4 w-4 text-sky-300" />
                  Choose a display
                </div>
                <div className="mt-4 grid gap-3">
                  {isLoadingSources ? (
                    <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-950/50 px-4 py-8 text-sm text-slate-400">
                      Looking for connected displays...
                    </div>
                  ) : (
                    sources.map((source) => {
                      const isSelected = source.id === selectedSourceId
                      const native = getNativeResolution(source)

                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => setSelectedSourceId(source.id)}
                          className={`group rounded-[26px] border px-4 py-4 text-left transition ${
                            isSelected
                              ? 'border-sky-300/50 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.72))] shadow-[0_18px_60px_rgba(14,165,233,0.12)]'
                              : 'border-white/8 bg-slate-950/55 hover:border-slate-500/40 hover:bg-slate-900/85'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold text-white">{source.name}</span>
                                {source.isPrimary ? (
                                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                                    Primary
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 text-sm text-slate-300">
                                {formatPixels(native.width, native.height)} native
                              </div>
                              <div className="mt-1 text-sm text-slate-400">
                                {formatPixels(source.bounds.width, source.bounds.height)} logical desktop
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                                Scale factor {source.scaleFactor.toFixed(2)}x
                              </div>
                            </div>
                            <div
                              className={`mt-1 h-4 w-4 rounded-full border transition ${
                                isSelected
                                  ? 'border-sky-100 bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.8)]'
                                  : 'border-slate-500 bg-transparent group-hover:border-slate-300'
                              }`}
                            />
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-white">
                  <ScanSearch className="h-4 w-4 text-orange-300" />
                  What Gemini should see
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {([
                    {
                      mode: 'full' as const,
                      title: 'Entire screen',
                      description: 'Best when you want the assistant to understand the full context of the selected monitor.',
                    },
                    {
                      mode: 'region' as const,
                      title: 'Focused region',
                      description: 'Best when you want Gemini to watch a smaller part of the display through a draggable overlay.',
                    },
                  ]).map((option) => {
                    const isSelected = shareMode === option.mode
                    return (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => setShareMode(option.mode)}
                        className={`rounded-[26px] border px-4 py-4 text-left transition ${
                          isSelected
                            ? 'border-orange-300/45 bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(15,23,42,0.76))]'
                            : 'border-white/8 bg-slate-950/55 hover:border-slate-500/40 hover:bg-slate-900/85'
                        }`}
                      >
                        <div className="text-base font-semibold text-white">{option.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{option.description}</div>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-[26px] border border-white/8 bg-slate-950/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selection summary</div>
                      <div className="mt-2 text-sm text-slate-200">
                        {shareMode === 'full'
                          ? selectedSource
                            ? `Gemini will receive the full feed from ${selectedSource.name}.`
                            : 'Choose a display to enable sharing.'
                          : selectedRegion
                            ? `Gemini will receive only the selected region: ${formatRegion(selectedRegion)}.`
                            : 'Choose the shared area on the selected display.'}
                      </div>
                    </div>

                    {shareMode === 'region' ? (
                      <button
                        type="button"
                        onClick={handlePickRegion}
                        disabled={!selectedSource || isPickingRegion || isConnected}
                        className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-sky-300 via-cyan-300 to-orange-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <WandSparkles className="h-4 w-4" />
                        {isPickingRegion ? 'Opening overlay...' : selectedRegion ? 'Adjust shared area' : 'Choose shared area'}
                      </button>
                    ) : null}
                  </div>

                  {shareMode === 'region' && selectedRegion ? (
                    <div className="mt-4 inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                      {formatRegion(selectedRegion)}
                    </div>
                  ) : null}
                </div>
              </section>

              {setupError ? (
                <div className="rounded-[24px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {setupError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!canStart}
                    className="rounded-[22px] bg-[linear-gradient(135deg,#7dd3fc,#38bdf8,#fdba74)] px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_55px_rgba(56,189,248,0.28)] transition hover:-translate-y-[1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isStarting ? 'Starting live session...' : 'Start Live Session'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stop}
                    className="rounded-[22px] bg-rose-500 px-6 py-4 text-sm font-semibold text-white shadow-[0_20px_55px_rgba(244,63,94,0.22)] transition hover:bg-rose-400"
                  >
                    Stop Live Session
                  </button>
                )}

                <div className="rounded-[22px] border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
                  Midscene automation stays on <span className="font-semibold text-white">{selectedSource?.name ?? 'the selected display'}</span>.
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-white">
                  <MessageSquareText className="h-4 w-4 text-sky-300" />
                  Conversation
                </div>
                <div className="mt-4 max-h-[42vh] min-h-[320px] overflow-y-auto rounded-[24px] border border-white/8 bg-slate-950/55 p-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm leading-7 text-slate-400">
                      Start a session and the conversation feed will appear here.
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`mb-3 rounded-[22px] border px-3.5 py-3 text-sm leading-6 ${
                          message.role === 'user'
                            ? 'border-sky-300/20 bg-sky-300/10 text-sky-50'
                            : message.role === 'system'
                              ? 'border-slate-700 bg-slate-900/80 text-slate-300'
                              : 'border-white/8 bg-slate-900 text-slate-100'
                        }`}
                      >
                        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
                          {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'Gemini'}
                        </div>
                        <div>{message.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Quick prompt
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                    className="flex-1 rounded-[20px] border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!isConnected || !inputText.trim()}
                    className="rounded-[20px] bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
