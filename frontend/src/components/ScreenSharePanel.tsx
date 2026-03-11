import {
  GeminiBolt,
  GeminiBroadcast,
  GeminiCaret,
  GeminiCrop,
  GeminiDisplay,
  GeminiIrisClosed,
  GeminiIrisOpen,
  GeminiMicOff,
  GeminiMicOn,
  GeminiPulse,
  GeminiReticle,
  GeminiWand,
} from './icons/GeminiIcons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { MagicCard } from '@/components/ui/magic-card'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { cn } from '@/lib/utils'
import type { DesktopCapturerSource, RegionBounds } from '../electron-env'
import type { ShareMode } from '../hooks/useScreenSharing'

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

export type ScreenSharePanelProps = {
  isConnected: boolean
  isStarting: boolean
  screenShareEnabled: boolean
  setScreenShareEnabled: (val: boolean) => void
  showDisplayPicker: boolean
  setShowDisplayPicker: (val: boolean) => void
  isLoadingSources: boolean
  sources: DesktopCapturerSource[]
  selectedSourceId: string | null
  setSelectedSourceId: (id: string) => void
  selectedSource: DesktopCapturerSource | null
  shareMode: ShareMode
  setShareMode: (mode: ShareMode) => void
  selectedRegion: RegionBounds | null
  isPickingRegion: boolean
  handlePickRegion: () => void
  setupError: string | null
  canStart: boolean
  handleStart: () => void
  stop: () => void
  nativeResolution: { width: number; height: number } | null
}

export function ScreenSharePanel({
  isConnected,
  isStarting,
  screenShareEnabled,
  setScreenShareEnabled,
  showDisplayPicker,
  setShowDisplayPicker,
  isLoadingSources,
  sources,
  selectedSourceId,
  setSelectedSourceId,
  selectedSource,
  shareMode,
  setShareMode,
  selectedRegion,
  isPickingRegion,
  handlePickRegion,
  setupError,
  canStart,
  handleStart,
  stop,
  nativeResolution,
}: ScreenSharePanelProps) {
  return (
    <div className="flex w-[380px] shrink-0 flex-col gap-0 overflow-y-auto border-r border-white/[0.04] bg-stone-950/40">
      <section className="border-b border-white/[0.04] p-4">
        <button
          type="button"
          onClick={() => !isConnected && setScreenShareEnabled(!screenShareEnabled)}
          disabled={isConnected}
          aria-label={screenShareEnabled ? 'Disable screen sharing' : 'Enable screen sharing'}
          aria-pressed={screenShareEnabled}
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
          <Switch checked={screenShareEnabled} className="pointer-events-none" aria-hidden />
        </button>
      </section>

      {screenShareEnabled && (
        <>
          <section className="border-b border-white/[0.04] p-4">
            <button
              type="button"
              onClick={() => setShowDisplayPicker(!showDisplayPicker)}
              aria-label="Toggle display picker"
              aria-expanded={showDisplayPicker}
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
                    {isLoadingSources ? 'Scanning...' : selectedSource?.name ?? 'No display found'}
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
                      aria-label={`Select display: ${source.name}`}
                      aria-pressed={isSelected}
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
  )
}
