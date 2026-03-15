import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  XIcon,
  Mic,
  MicOff,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWalkthroughAgent } from '@/hooks/useWalkthroughAgent'
import { WalkthroughTranscript } from './WalkthroughTranscript'
import { WalkthroughComposer } from './WalkthroughComposer'
import { WalkthroughStarterPrompts } from './WalkthroughStarterPrompts'
import { WalkthroughExplainer } from './WalkthroughExplainer'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  errorMessage,
}: {
  status: string
  errorMessage: string | null
}) {
  if (status === 'connecting') {
    return (
      <Badge
        variant="outline"
        className="h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
        Connecting…
      </Badge>
    )
  }
  if (status === 'connected') {
    return (
      <Badge
        variant="outline"
        className="h-auto gap-2 rounded-full border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </Badge>
    )
  }
  if (status === 'degraded') {
    return (
      <Badge
        variant="outline"
        className="h-auto gap-2 rounded-full border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-300"
      >
        <AlertCircle className="size-3" />
        {errorMessage ?? 'Degraded'}
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge
        variant="outline"
        className="h-auto gap-2 rounded-full border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300"
      >
        <AlertCircle className="size-3" />
        {errorMessage ?? 'Connection error'}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="h-auto rounded-full border-stone-700 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-500"
    >
      Disconnected
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Mini voice visualizer
// ---------------------------------------------------------------------------

function MiniVisualizer({
  inputIntensityRef,
  outputIntensityRef,
  isActive,
}: {
  inputIntensityRef: React.RefObject<number>
  outputIntensityRef: React.RefObject<number>
  isActive: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)

  useEffect(() => {
    if (!isActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = canvas!.offsetWidth * window.devicePixelRatio
      canvas!.height = canvas!.offsetHeight * window.devicePixelRatio
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const w = canvas!.offsetWidth
      const h = canvas!.offsetHeight
      const cx = w / 2
      const cy = h / 2
      ctx!.clearRect(0, 0, w, h)

      const inputLevel = inputIntensityRef.current ?? 0
      const outputLevel = outputIntensityRef.current ?? 0
      const combined = Math.max(inputLevel, outputLevel)
      const time = Date.now() / 1000

      // Pulsing orb
      const baseR = Math.min(w, h) * 0.2
      const pulse = combined * baseR * 0.8
      const breathe = Math.sin(time * 0.8) * 2
      const r = baseR + pulse + breathe

      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0, `rgba(217, 119, 6, ${0.35 + combined * 0.4})`)
      grad.addColorStop(0.6, `rgba(217, 119, 6, ${0.1 + combined * 0.15})`)
      grad.addColorStop(1, 'rgba(217, 119, 6, 0)')

      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, Math.PI * 2)
      ctx!.fillStyle = grad
      ctx!.fill()

      // Core dot
      const coreR = 3 + combined * 5
      ctx!.beginPath()
      ctx!.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(251, 191, 36, ${0.6 + combined * 0.4})`
      ctx!.fill()

      // Level bars
      const barW = 3
      const barGap = 16
      const maxH = h * 0.55

      // Input bar (left)
      const inH = 4 + inputLevel * maxH
      ctx!.fillStyle = `rgba(251, 191, 36, ${0.3 + inputLevel * 0.5})`
      ctx!.beginPath()
      ctx!.roundRect(cx - barGap - barW, cy - inH / 2, barW, inH, 2)
      ctx!.fill()

      // Output bar (right)
      const outH = 4 + outputLevel * maxH
      ctx!.fillStyle = `rgba(217, 119, 6, ${0.3 + outputLevel * 0.5})`
      ctx!.beginPath()
      ctx!.roundRect(cx + barGap, cy - outH / 2, barW, outH, 2)
      ctx!.fill()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isActive, inputIntensityRef, outputIntensityRef])

  return (
    <canvas
      ref={canvasRef}
      className="size-full"
      aria-hidden="true"
    />
  )
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

interface WalkthroughOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function WalkthroughOverlay({
  isOpen,
  onClose,
}: WalkthroughOverlayProps) {
  const {
    connectionStatus,
    errorMessage,
    transcript,
    toolActivity,
    start,
    stop,
    sendText,
    inputIntensityRef,
    outputIntensityRef,
  } = useWalkthroughAgent()

  const [explainerOpen, setExplainerOpen] = useState(true)
  const launcherRef = useRef<HTMLElement | null>(null)

  // Track the element that opened us so we can return focus
  useEffect(() => {
    if (isOpen) {
      launcherRef.current = document.activeElement as HTMLElement | null
    }
  }, [isOpen])

  // Start session when overlay opens
  useEffect(() => {
    if (isOpen) {
      start().catch((err: unknown) => {
        console.error('Failed to start walkthrough:', err)
      })
    }
    return () => {
      stop()
    }
  }, [isOpen, start, stop])

  const handleClose = useCallback(() => {
    stop()
    onClose()
    // Return focus to launcher after a tick
    requestAnimationFrame(() => {
      launcherRef.current?.focus()
    })
  }, [stop, onClose])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose()
    },
    [handleClose],
  )

  const handleSend = useCallback(
    (text: string) => {
      sendText(text)
    },
    [sendText],
  )

  const handleStarterSelect = useCallback(
    (prompt: string) => {
      sendText(prompt)
    },
    [sendText],
  )

  const handleRetry = useCallback(() => {
    stop()
    start().catch((err: unknown) => {
      console.error('Retry failed:', err)
    })
  }, [stop, start])

  const isSessionActive =
    connectionStatus === 'connected' ||
    connectionStatus === 'connecting' ||
    connectionStatus === 'degraded'

  const canSend =
    connectionStatus === 'connected' || connectionStatus === 'degraded'

  const hasMicIssue =
    connectionStatus === 'degraded' &&
    (errorMessage?.toLowerCase().includes('microphone') ?? false)

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal>
            {/* Backdrop */}
            <DialogPrimitive.Backdrop
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl"
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                />
              }
            />

            {/* Popup shell */}
            <DialogPrimitive.Popup
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 outline-none"
              render={
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              }
            >
              <DialogPrimitive.Title className="sr-only">
                Talk to Voidpilot
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Voice walkthrough agent for the Voidpilot project
              </DialogPrimitive.Description>

              {/* Glass shell */}
              <div className="relative flex size-full max-h-[min(800px,100%)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-stone-950/90 shadow-2xl shadow-black/40 backdrop-blur-2xl md:flex-row">
                {/* ── Primary pane: Transcript ────────────────── */}
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* Top bar */}
                  <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={connectionStatus}
                        errorMessage={errorMessage}
                      />
                      {hasMicIssue && (
                        <span className="flex items-center gap-1 text-[11px] text-yellow-400/80">
                          <MicOff className="size-3" />
                          Mic unavailable
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Explainer toggle (always visible) */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setExplainerOpen((o) => !o)}
                        aria-label={
                          explainerOpen
                            ? 'Close how it works'
                            : 'How it works'
                        }
                        aria-expanded={explainerOpen}
                        className="text-stone-500 hover:text-stone-300 md:hidden"
                      >
                        <Info />
                      </Button>
                      {/* Retry on error */}
                      {(connectionStatus === 'error' ||
                        connectionStatus === 'disconnected') && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleRetry}
                          aria-label="Retry connection"
                          className="text-stone-500 hover:text-stone-300"
                        >
                          <RefreshCw />
                        </Button>
                      )}
                      {/* Close */}
                      <DialogPrimitive.Close
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Close walkthrough"
                            className="text-stone-500 hover:text-stone-300"
                          />
                        }
                      >
                        <XIcon />
                      </DialogPrimitive.Close>
                    </div>
                  </div>

                  {/* Mobile explainer (collapsible) */}
                  <AnimatePresence>
                    {explainerOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-b border-white/[0.06] md:hidden"
                      >
                        <div className="max-h-60 overflow-y-auto px-4 py-3">
                          <WalkthroughExplainer />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Transcript body */}
                  <WalkthroughTranscript
                    turns={transcript}
                    toolActivity={toolActivity}
                    emptyState={
                      <WalkthroughStarterPrompts
                        onSelect={handleStarterSelect}
                        disabled={!canSend}
                      />
                    }
                  />

                  {/* Error banner */}
                  {connectionStatus === 'error' && (
                    <div className="flex items-center gap-2 border-t border-red-500/10 bg-red-500/5 px-4 py-2 text-xs text-red-300">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span className="flex-1">
                        {errorMessage ?? 'Connection lost'}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleRetry}
                        className="shrink-0 text-red-300 hover:text-red-200"
                      >
                        <RefreshCw data-icon="inline-start" />
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* Composer */}
                  <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
                    <WalkthroughComposer
                      onSend={handleSend}
                      disabled={!canSend}
                    />
                    {isSessionActive && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-stone-600">
                        {hasMicIssue ? (
                          <>
                            <MicOff className="size-2.5" />
                            <span>Voice unavailable — type your questions</span>
                          </>
                        ) : connectionStatus === 'connected' ? (
                          <>
                            <Mic className="size-2.5" />
                            <span>
                              Listening — speak naturally or type below
                            </span>
                          </>
                        ) : connectionStatus === 'connecting' ? (
                          <span>Starting session…</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Secondary pane: Voice + Explainer (desktop) ── */}
                <div className="hidden w-72 shrink-0 flex-col border-l border-white/[0.06] md:flex lg:w-80">
                  {/* Voice visualizer */}
                  <div className="flex shrink-0 flex-col items-center gap-2 border-b border-white/[0.06] px-4 py-4">
                    <div className="size-28 lg:size-32">
                      <MiniVisualizer
                        inputIntensityRef={inputIntensityRef}
                        outputIntensityRef={outputIntensityRef}
                        isActive={
                          connectionStatus === 'connected' ||
                          connectionStatus === 'degraded'
                        }
                      />
                    </div>
                    <p className="text-[10px] text-stone-600">
                      {connectionStatus === 'connected'
                        ? 'Left = you · Right = Gemini'
                        : connectionStatus === 'connecting'
                          ? 'Starting voice session…'
                          : connectionStatus === 'degraded'
                            ? 'Session active (limited)'
                            : 'Voice inactive'}
                    </p>
                  </div>

                  {/* Explainer section (desktop — always visible) */}
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                    <ExplainerToggleDesktop
                      open={explainerOpen}
                      onToggle={() => setExplainerOpen((o) => !o)}
                    />
                    <AnimatePresence initial={false}>
                      {explainerOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3">
                            <WalkthroughExplainer />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

// ---------------------------------------------------------------------------
// Desktop explainer toggle
// ---------------------------------------------------------------------------

function ExplainerToggleDesktop({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-xs font-medium text-stone-400 transition-colors hover:text-stone-300"
    >
      <span className="flex items-center gap-1.5">
        <Info className="size-3.5" />
        How it works
      </span>
      {open ? (
        <ChevronUp className="size-3.5" />
      ) : (
        <ChevronDown className="size-3.5" />
      )}
    </button>
  )
}
