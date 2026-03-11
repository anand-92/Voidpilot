import { useEffect, useMemo, useRef, useState } from 'react'
import { GeminiStar } from './components/icons/GeminiIcons'
import { useGeminiLive } from './hooks/useGeminiLive'
import { useScreenSharing } from './hooks/useScreenSharing'
import { StatusChip } from './components/SharedUI'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { ScreenSharePanel } from './components/ScreenSharePanel'
import { ChatArea } from './components/ChatArea'
import type { DesktopCapturerSource } from './electron-env'

function getNativeResolution(source: DesktopCapturerSource) {
  return {
    width: Math.round(source.bounds.width * source.scaleFactor),
    height: Math.round(source.bounds.height * source.scaleFactor),
  }
}

export default function App() {
  const { isConnected, isStarting, messages, start, stop, sendText } = useGeminiLive()
  const [inputText, setInputText] = useState('')
  const {
    screenShareEnabled,
    setScreenShareEnabled,
    sources,
    selectedSourceId,
    setSelectedSourceId,
    shareMode,
    setShareMode,
    selectedRegion,
    isPickingRegion,
    isLoadingSources,
    setupError,
    setSetupError,
    showDisplayPicker,
    setShowDisplayPicker,
    selectedSource,
    handlePickRegion,
    validateBeforeStart,
  } = useScreenSharing()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const nativeResolution = useMemo(
    () => (selectedSource ? getNativeResolution(selectedSource) : null),
    [selectedSource],
  )

  const handleSend = () => {
    if (inputText.trim()) {
      sendText(inputText)
      setInputText('')
    }
  }

  const handleStart = async () => {
    if (!validateBeforeStart()) return

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
          <ScreenSharePanel
            isConnected={isConnected}
            isStarting={isStarting}
            screenShareEnabled={screenShareEnabled}
            setScreenShareEnabled={setScreenShareEnabled}
            showDisplayPicker={showDisplayPicker}
            setShowDisplayPicker={setShowDisplayPicker}
            isLoadingSources={isLoadingSources}
            sources={sources}
            selectedSourceId={selectedSourceId}
            setSelectedSourceId={setSelectedSourceId}
            selectedSource={selectedSource}
            shareMode={shareMode}
            setShareMode={setShareMode}
            selectedRegion={selectedRegion}
            isPickingRegion={isPickingRegion}
            handlePickRegion={handlePickRegion}
            setupError={setupError}
            canStart={canStart}
            handleStart={handleStart}
            stop={stop}
            nativeResolution={nativeResolution}
          />
          <ChatArea
            isConnected={isConnected}
            messages={messages}
            messagesEndRef={messagesEndRef}
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
          />
        </div>
      </main>
    </TooltipProvider>
  )
}
