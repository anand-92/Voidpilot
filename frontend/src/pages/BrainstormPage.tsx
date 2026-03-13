import { useCallback, useEffect, useRef, useState } from 'react'
import { BrainstormEntryModal } from '../components/brainstorm/BrainstormEntryModal'
import { BrainstormDesktopLayout, BrainstormMobileLayout, type BrainstormLayoutProps } from '../components/brainstorm/BrainstormLayouts'
import { getArtifactSize } from '../components/brainstorm/utils'
import { useBrainstormEntryAuth } from '../hooks/useBrainstormEntryAuth'
import { useGeminiBrainstorm } from '../hooks/useGeminiBrainstorm'

export default function BrainstormPage() {
  const {
    status: authStatus,
    user,
    errorMessage,
    isSubmitting: isAuthSubmitting,
    clearError,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOutFromBrainstorm,
  } = useBrainstormEntryAuth()
  const {
    isConnected,
    isStarting,
    messages,
    artifacts,
    isGenerating,
    intensityRef,
    selectedFlashModel,
    setSelectedFlashModel,
    selectedTools,
    setSelectedTools,
    start,
    stop,
    sendText,
  } = useGeminiBrainstorm()

  const [inputText, setInputText] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [hasGuestAccess, setHasGuestAccess] = useState(false)
  const [hasSignedInWorkspaceAccess, setHasSignedInWorkspaceAccess] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isEntryModalOpen =
    authStatus === 'loading'
      ? true
      : authStatus === 'signed_in'
        ? !hasSignedInWorkspaceAccess
        : !hasGuestAccess

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
    selectedTools,
    setSelectedTools,
    messagesEndRef,
    setInputText,
    setSelectedArtifact,
    handleSend,
    handleConnect,
    stop,
  }

  return (
    <>
      <div
        aria-hidden={isEntryModalOpen}
        inert={isEntryModalOpen}
        className={isEntryModalOpen ? 'pointer-events-none select-none blur-[2px] saturate-75' : ''}
      >
        {isMobileLayout ? (
          <BrainstormMobileLayout {...sharedProps} />
        ) : (
          <BrainstormDesktopLayout {...sharedProps} />
        )}
      </div>

      {isEntryModalOpen && (
        <BrainstormEntryModal
          status={authStatus}
          user={user}
          isSubmitting={isAuthSubmitting}
          errorMessage={errorMessage}
          onClearError={clearError}
          onContinueAsGuest={() => {
            clearError()
            setHasGuestAccess(true)
          }}
          onContinueToWorkspace={() => {
            clearError()
            setHasSignedInWorkspaceAccess(true)
          }}
          onSignInWithPassword={signInWithPassword}
          onSignUpWithPassword={signUpWithPassword}
          onSignInWithGoogle={signInWithGoogle}
          onSignOut={signOutFromBrainstorm}
        />
      )}
    </>
  )
}
