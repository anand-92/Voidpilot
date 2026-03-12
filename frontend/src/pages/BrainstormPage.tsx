import { useCallback, useEffect, useRef, useState } from 'react'
import { BrainstormDesktopLayout, BrainstormMobileLayout, type BrainstormLayoutProps } from '../components/brainstorm/BrainstormLayouts'
import { getArtifactSize } from '../components/brainstorm/utils'
import { useGeminiBrainstorm } from '../hooks/useGeminiBrainstorm'

export default function BrainstormPage() {
  const {
    isConnected,
    isStarting,
    messages,
    artifacts,
    isGenerating,
    intensityRef,
    selectedFlashModel,
    setSelectedFlashModel,
    start,
    stop,
    sendText,
  } = useGeminiBrainstorm()

  const [inputText, setInputText] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1024px)')

    const updateLayoutMode = () => {
      const touchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0
      const mobileUserAgent = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
      setIsMobileLayout(mediaQuery.matches || (mobileUserAgent && touchPoints > 0))
    }

    updateLayoutMode()
    mediaQuery.addEventListener('change', updateLayoutMode)

    return () => mediaQuery.removeEventListener('change', updateLayoutMode)
  }, [])

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

  const artifactList = Array.from(artifacts.entries())
  const totalSize = artifactList.reduce(
    (acc, [, artifact]) => acc + getArtifactSize(artifact),
    0,
  )

  const currentArtifact =
    selectedArtifact !== null ? artifacts.get(selectedArtifact) ?? null : null

  const sharedProps: BrainstormLayoutProps = {
    intensityRef,
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
  }

  return isMobileLayout ? (
    <BrainstormMobileLayout {...sharedProps} />
  ) : (
    <BrainstormDesktopLayout {...sharedProps} />
  )
}
