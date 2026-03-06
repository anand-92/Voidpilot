import { Monitor, ScanSearch, Sparkles, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'
import type { DesktopCapturerSource, RegionBounds } from './electron-env'

type ShareMode = 'full' | 'region'

function formatRegion(region?: RegionBounds) {
  if (!region) {
    return 'No area selected yet'
  }
  return `${region.width} x ${region.height} at ${region.x}, ${region.y}`
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
    if (!selectedSource || !window.electronAPI?.openRegionSelector) {
      return
    }

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
    if (!selectedSource || !window.electronAPI?.setMidsceneDisplay) {
      return
    }
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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.16),_transparent_28%),linear-gradient(180deg,_#020617,_#0f172a)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row lg:px-10">
        <section className="flex-1 rounded-[32px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.65)] backdrop-blur-xl lg:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Sparkles className="h-3.5 w-3.5" />
                Live desktop agent
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Shape what Gemini can see before the call begins.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Pick a display, choose whether to share the full screen or only a focused area, and then launch the live session with Midscene bound to the same monitor.
              </p>
            </div>
            <div className="hidden rounded-[28px] border border-white/10 bg-slate-900/70 p-4 text-right lg:block">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Session state</div>
              <div className={`mt-2 text-lg font-semibold ${isConnected ? 'text-emerald-300' : isStarting ? 'text-amber-200' : 'text-slate-100'}`}>
                {isConnected ? 'Connected' : isStarting ? 'Starting' : 'Ready'}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <Monitor className="h-4 w-4 text-sky-300" />
                Choose a display
              </div>
              <div className="mt-4 grid gap-3">
                {isLoadingSources ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-6 text-sm text-slate-400">
                    Looking for connected displays...
                  </div>
                ) : (
                  sources.map((source) => {
                    const isSelected = source.id === selectedSourceId
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => setSelectedSourceId(source.id)}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          isSelected
                            ? 'border-sky-400/60 bg-sky-400/10 shadow-[0_12px_50px_rgba(56,189,248,0.12)]'
                            : 'border-white/8 bg-slate-950/60 hover:border-slate-500/40 hover:bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-base font-semibold text-white">{source.name}</div>
                            <div className="mt-1 text-sm text-slate-400">
                              {source.bounds.width} x {source.bounds.height}
                              {source.isPrimary ? ' • Primary display' : ''}
                            </div>
                          </div>
                          <div
                            className={`h-3.5 w-3.5 rounded-full border ${
                              isSelected ? 'border-sky-200 bg-sky-300' : 'border-slate-500 bg-transparent'
                            }`}
                          />
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <ScanSearch className="h-4 w-4 text-orange-300" />
                Share mode
              </div>
              <div className="mt-4 grid gap-3">
                {(['full', 'region'] as ShareMode[]).map((mode) => {
                  const isSelected = shareMode === mode
                  const title = mode === 'full' ? 'Full display' : 'Part of display'
                  const description =
                    mode === 'full'
                      ? 'Gemini sees the entire selected monitor.'
                      : 'Gemini sees only a draggable, resizable area on the selected monitor.'
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setShareMode(mode)}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        isSelected
                          ? 'border-orange-300/60 bg-orange-400/10'
                          : 'border-white/8 bg-slate-950/60 hover:border-slate-500/40 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="text-base font-semibold text-white">{title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">{description}</div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 rounded-[24px] border border-white/8 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Gemini view</div>
                <div className="mt-3 text-sm text-slate-300">
                  {shareMode === 'full'
                    ? 'The full selected display will be captured and streamed to Gemini.'
                    : selectedRegion
                      ? `Focused region selected: ${formatRegion(selectedRegion)}`
                      : 'Choose the area Gemini should watch before starting.'}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {shareMode === 'region' ? (
                    <button
                      type="button"
                      onClick={handlePickRegion}
                      disabled={!selectedSource || isPickingRegion || isConnected}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-orange-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_50px_rgba(56,189,248,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <WandSparkles className="h-4 w-4" />
                      {selectedRegion ? 'Adjust shared area' : 'Choose shared area'}
                    </button>
                  ) : null}
                  {selectedRegion ? (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {formatRegion(selectedRegion)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {setupError ? (
            <div className="mt-5 rounded-[24px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {setupError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {!isConnected ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="rounded-[22px] bg-gradient-to-r from-sky-400 via-cyan-300 to-orange-300 px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_55px_rgba(56,189,248,0.28)] transition hover:translate-y-[-1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isStarting ? 'Starting live session...' : 'Start Live Session'}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="rounded-[22px] bg-rose-500 px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_55px_rgba(244,63,94,0.2)] transition hover:bg-rose-400"
              >
                Stop Live Session
              </button>
            )}
            <div className="rounded-[22px] border border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
              Midscene automation will stay on <span className="font-semibold text-white">{selectedSource?.name ?? 'the selected display'}</span>.
            </div>
          </div>
        </section>

        <aside className="flex w-full max-w-xl flex-col gap-5 lg:w-[420px]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_30px_120px_rgba(2,6,23,0.65)] backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Conversation</div>
            <div className="mt-4 h-[380px] overflow-y-auto rounded-[24px] border border-white/8 bg-slate-900/60 p-4">
              {messages.length === 0 ? (
                <p className="mt-24 text-center text-sm italic text-slate-400">
                  No messages yet. Start the session, then speak or type.
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-3 rounded-2xl px-3 py-2 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-sky-400/10 text-sky-100'
                        : message.role === 'system'
                          ? 'bg-slate-800/70 text-slate-400'
                          : 'bg-slate-900/90 text-slate-100'
                    }`}
                  >
                    <span className="mr-2 font-semibold">
                      {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'Gemini'}
                    </span>
                    <span>{message.content}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_30px_120px_rgba(2,6,23,0.65)] backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Quick text prompt</div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="flex-1 rounded-[20px] border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!isConnected || !inputText.trim()}
                className="rounded-[20px] bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
