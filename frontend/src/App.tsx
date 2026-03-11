import {
  GeminiBolt,
  GeminiBroadcast,
  GeminiCaret,
  GeminiChat,
  GeminiCheck,
  GeminiClose,
  GeminiCrop,
  GeminiDisplay,
  GeminiIrisClosed,
  GeminiIrisOpen,
  GeminiMicOff,
  GeminiMicOn,
  GeminiPulse,
  GeminiReticle,
  GeminiSend,
  GeminiShield,
  GeminiStar,
  GeminiTerminal,
  GeminiWand,
} from './components/icons/GeminiIcons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'
import type { PendingBashRequest } from './hooks/useGeminiLive'
import type { DesktopCapturerSource, RegionBounds } from './electron-env'
import { StatusChip, MessageBubble } from './components/SharedUI'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MagicCard } from '@/components/ui/magic-card'
import { BorderBeam } from '@/components/ui/border-beam'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { BlurFade } from '@/components/ui/blur-fade'
import { cn } from '@/lib/utils'

type ShareMode = 'full' | 'region'

function formatRegion(region?: RegionBounds) {
  if (!region) return 'No area selected yet'
  return `${region.width}x${region.height} at (${region.x}, ${region.y})`
}

function formatPixels(width: number, height: number) {
  return `${width.toLocaleString()}x${height.toLocaleString()}`
}

function getNativeResolution(source: DesktopCapturerSource) {
  return {
    width: Math.round(source.bounds.width * source.scaleFactor),
    height: Math.round(source.bounds.height * source.scaleFactor),
  }
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
    <MagicCard
      className="rounded-xl"
      gradientColor="#1c1917"
      gradientFrom="#d97706"
      gradientTo="#92400e"
      gradientOpacity={0.4}
      gradientSize={150}
    >
      <div className="p-3.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
          <Icon className={cn('size-3', iconColor)} />
          {title}
        </div>
        <div className="mt-2 text-sm text-stone-300">{children}</div>
      </div>
    </MagicCard>
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
    <Dialog open onOpenChange={(open) => { if (!open) onDeny() }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg border-white/[0.06] bg-stone-950 p-0 shadow-[0_32px_80px_rgba(0,0,0,0.6)] sm:max-w-lg"
      >
        <DialogHeader className="flex-row items-center gap-3 border-b border-white/[0.06] bg-amber-500/[0.06] px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <GeminiShield className="size-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-sm font-bold text-white">Command Confirmation</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs">
              Gemini wants to run this command on your computer
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDeny}
            aria-label="Close command confirmation"
            className="ml-auto shrink-0 text-stone-500 hover:text-stone-300"
          >
            <GeminiClose className="size-4" />
          </Button>
        </DialogHeader>

        <div className="px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            <GeminiTerminal className="size-3 text-amber-400" />
            Command
          </div>
          <div className="mt-2 rounded-xl border border-white/[0.06] bg-stone-950 px-4 py-3">
            <code className="break-all font-mono text-sm text-amber-300">
              {request.command}
            </code>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            You can also say <span className="font-medium text-stone-300">&quot;yes&quot;</span> or{' '}
            <span className="font-medium text-stone-300">&quot;go ahead&quot;</span> to approve, or{' '}
            <span className="font-medium text-stone-300">&quot;no&quot;</span> /{' '}
            <span className="font-medium text-stone-300">&quot;cancel&quot;</span> to deny.
          </p>
        </div>

        <DialogFooter className="flex-row gap-3 border-t border-white/[0.06] bg-stone-900/40 px-5 py-4">
          <Button
            variant="outline"
            onClick={onDeny}
            className="flex-1 gap-2 rounded-xl border-stone-700 bg-stone-800/60 py-3 text-sm font-semibold text-stone-300 hover:bg-stone-800"
          >
            <GeminiClose className="size-4" />
            Deny
          </Button>
          <Button
            onClick={onAllow}
            className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/20 hover:brightness-110"
          >
            <GeminiCheck className="size-4" />
            Allow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function App() {
  const { isConnected, isStarting, messages, start, stop, sendText, pendingBash, confirmBash, denyBash } =
    useGeminiLive()
  const [inputText, setInputText] = useState('')
  const [screenShareEnabled, setScreenShareEnabled] = useState(false)
  const [sources, setSources] = useState<DesktopCapturerSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>('full')
  const [selectedRegion, setSelectedRegion] = useState<RegionBounds | null>(null)
  const [isPickingRegion, setIsPickingRegion] = useState(false)
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [showDisplayPicker, setShowDisplayPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!screenShareEnabled) {
      setSources([])
      setSelectedSourceId('')
      setIsLoadingSources(true)
      setSetupError(null)
      return
    }

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
  }, [screenShareEnabled])

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
    <TooltipProvider>
      <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.04] bg-stone-950/80 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <GeminiStar className="size-4 text-white" />
            </div>
            <AnimatedGradientText colorFrom="#d97706" colorTo="#fbbf24" className="text-sm font-semibold tracking-tight">
              Voidpilot
            </AnimatedGradientText>
          </div>

          <StatusChip isConnected={isConnected} isStarting={isStarting} />
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left: Controls */}
          <div className="flex w-[380px] shrink-0 flex-col gap-0 overflow-y-auto border-r border-white/[0.04] bg-stone-950/40">

            {/* Screen sharing toggle */}
            <section className="border-b border-white/[0.04] p-4">
              <button
                type="button"
                onClick={() => !isConnected && setScreenShareEnabled(!screenShareEnabled)}
                disabled={isConnected}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
                  screenShareEnabled
                    ? 'border-amber-500/20 bg-amber-500/[0.07]'
                    : 'border-white/[0.06] bg-stone-900/60',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-lg',
                      screenShareEnabled ? 'bg-amber-500/15' : 'bg-stone-800',
                    )}
                  >
                    {screenShareEnabled ? (
                      <GeminiIrisOpen className="size-4 text-amber-400" />
                    ) : (
                      <GeminiIrisClosed className="size-4 text-stone-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Screen Sharing</div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {screenShareEnabled ? 'Gemini can see your screen' : 'Audio-only mode'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={screenShareEnabled}
                  className="pointer-events-none"
                  aria-hidden
                />
              </button>
            </section>

            {screenShareEnabled && (
              <>
                {/* Display selector */}
                <section className="border-b border-white/[0.04] p-4">
                  <button
                    type="button"
                    onClick={() => setShowDisplayPicker(!showDisplayPicker)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.06] bg-stone-900/60 px-4 py-3 text-left transition-colors hover:bg-stone-900/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                        <GeminiDisplay className="size-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                          Display
                        </div>
                        <div className="mt-0.5 text-sm font-medium text-white">
                          {isLoadingSources
                            ? 'Scanning...'
                            : selectedSource?.name ?? 'No display found'}
                        </div>
                      </div>
                    </div>
                    <GeminiCaret
                      className={cn('size-4 text-stone-500 transition-transform', showDisplayPicker && 'rotate-180')}
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
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                              isSelected
                                ? 'border-amber-500/20 bg-amber-500/10'
                                : 'border-white/[0.06] bg-stone-900/60 hover:border-white/10 hover:bg-stone-900/80',
                            )}
                          >
                            <div
                              className={cn(
                                'size-3 shrink-0 rounded-full border-2 transition-colors',
                                isSelected ? 'border-amber-400 bg-amber-400' : 'border-stone-600 bg-transparent',
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-white">{source.name}</span>
                                {source.isPrimary && (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 border-amber-500/20 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400"
                                  >
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-stone-500">
                                {formatPixels(native.width, native.height)} · {source.scaleFactor}x
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* Share mode */}
                <section className="border-b border-white/[0.04] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    <GeminiReticle className="size-3.5 text-orange-400" />
                    Capture mode
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { mode: 'full' as ShareMode, label: 'Full screen', icon: GeminiDisplay },
                      { mode: 'region' as ShareMode, label: 'Region', icon: GeminiCrop },
                    ].map(({ mode, label, icon: Icon }) => {
                      const isActive = shareMode === mode
                      return (
                        <Button
                          key={mode}
                          variant="outline"
                          onClick={() => setShareMode(mode)}
                          className={cn(
                            'h-auto gap-2 rounded-xl px-3.5 py-3 text-sm font-medium',
                            isActive
                              ? 'border-orange-400/20 bg-orange-500/10 text-orange-200 hover:bg-orange-500/15 hover:text-orange-200'
                              : 'border-white/[0.06] bg-stone-900/60 text-stone-500 hover:text-stone-300',
                          )}
                        >
                          <Icon className={cn('size-4', isActive ? 'text-orange-400' : 'text-stone-500')} />
                          {label}
                        </Button>
                      )
                    })}
                  </div>

                  {shareMode === 'region' && (
                    <div className="mt-3 rounded-xl border border-dashed border-white/[0.06] bg-stone-900/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-stone-500">
                            {selectedRegion ? formatRegion(selectedRegion) : 'No region selected'}
                          </div>
                        </div>
                        <Button
                          onClick={handlePickRegion}
                          disabled={!selectedSource || isPickingRegion || isConnected}
                          className="shrink-0 gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-3 py-2 text-xs font-semibold text-stone-950 shadow-lg shadow-amber-500/20 hover:brightness-110"
                          size="sm"
                        >
                          <GeminiWand className="size-3.5" />
                          {isPickingRegion ? 'Picking...' : selectedRegion ? 'Re-pick' : 'Select area'}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="flex flex-col gap-3 p-4">
                  <InfoCard icon={GeminiPulse} iconColor="text-amber-400" title="Display info">
                    {nativeResolution && selectedSource
                      ? `${formatPixels(nativeResolution.width, nativeResolution.height)} native · ${formatPixels(selectedSource.bounds.width, selectedSource.bounds.height)} logical`
                      : 'Select a display'}
                  </InfoCard>

                  <InfoCard icon={GeminiBroadcast} iconColor="text-orange-400" title="Gemini sees">
                    {shareMode === 'full'
                      ? selectedSource
                        ? `Full feed from ${selectedSource.name}`
                        : 'Waiting for display'
                      : selectedRegion
                        ? formatRegion(selectedRegion)
                        : 'Region not yet defined'}
                  </InfoCard>

                  <InfoCard icon={GeminiBolt} iconColor="text-yellow-500" title="Midscene target">
                    {selectedSource?.name ?? 'None'}
                  </InfoCard>
                </section>
              </>
            )}

            {setupError && (
              <div className="mx-4 mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {setupError}
              </div>
            )}

            <div className="mt-auto p-4">
              <Separator className="mb-4 bg-white/[0.04]" />
              {!isConnected ? (
                <ShimmerButton
                  onClick={handleStart}
                  disabled={!canStart}
                  shimmerColor="#fbbf24"
                  shimmerDuration="2.5s"
                  background="linear-gradient(135deg, #d97706, #b45309)"
                  borderRadius="12px"
                  className="w-full gap-2.5 px-5 py-3.5 text-sm font-bold text-stone-950 shadow-[0_8px_32px_rgba(217,119,6,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <GeminiMicOn className="size-4" />
                  {isStarting ? 'Connecting...' : 'Start Live Session'}
                </ShimmerButton>
              ) : (
                <Button
                  onClick={stop}
                  variant="destructive"
                  className="w-full gap-2.5 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_32px_rgba(220,38,38,0.25)] hover:bg-red-500"
                  size="lg"
                >
                  <GeminiMicOff className="size-4" />
                  End Session
                </Button>
              )}
            </div>
          </div>

          {/* Right: Conversation */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {isConnected && <BorderBeam size={60} duration={6} colorFrom="#d97706" colorTo="#b45309" />}

            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] bg-stone-950/40 px-5 py-3">
              <GeminiChat className="size-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Conversation</span>
              <Badge variant="secondary" className="ml-auto text-[10px] font-medium uppercase tracking-widest text-stone-500">
                {messages.length} messages
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-5 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-stone-900/60">
                      <GeminiStar className="size-7 text-amber-500/30" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-500">No messages yet</p>
                      <p className="mt-1 text-xs text-stone-600">
                        Start a session to begin talking with Gemini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message, index) => (
                      <BlurFade key={index} delay={0.03} duration={0.25}>
                        <MessageBubble role={message.role} content={message.content} />
                      </BlurFade>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-white/[0.04] bg-stone-950/40 px-5 py-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                <GeminiCheck className="size-3.5 text-amber-500/40" />
                Quick prompt
              </div>
              <div className="mt-2.5 flex gap-2.5">
                <Input
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                  placeholder={isConnected ? 'Type a message...' : 'Connect first to chat'}
                  disabled={!isConnected}
                  aria-label="Message input"
                  className="h-10 flex-1 rounded-xl border-white/[0.06] bg-stone-900/60 px-4 text-sm text-white placeholder:text-stone-600 focus-visible:border-amber-500/30 focus-visible:bg-stone-900/80"
                />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={handleSend}
                        disabled={!isConnected || !inputText.trim()}
                        aria-label="Send message"
                        size="icon-lg"
                        className="shrink-0 rounded-xl bg-amber-600/80 text-stone-950 hover:bg-amber-500"
                      />
                    }
                  >
                    <GeminiSend className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {pendingBash && (
          <BashConfirmPopup request={pendingBash} onAllow={confirmBash} onDeny={denyBash} />
        )}
      </main>
    </TooltipProvider>
  )
}
