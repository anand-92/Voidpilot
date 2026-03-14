import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BrainstormEntryModal } from '../components/brainstorm/BrainstormEntryModal'
import { BrainstormDesktopLayout, BrainstormMobileLayout, CreativeSparkDesktopLayout, CreativeSparkMobileLayout, type BrainstormLayoutProps } from '../components/brainstorm/BrainstormLayouts'
import { ModeSelectionScreen, type BrainstormType } from '../components/brainstorm/ModeSelectionScreen'
import { getArtifactSize } from '../components/brainstorm/utils'
import { useBrainstormEntryAuth } from '../hooks/useBrainstormEntryAuth'
import { useGeminiBrainstorm } from '../hooks/useGeminiBrainstorm'
import { useBrainstormSessionLibrary } from '../hooks/useBrainstormSessionLibrary'
import { createBrainstormShare } from '../lib/brainstormShareApi'

export default function BrainstormPage() {
  const {
    status: authStatus,
    user,
    errorMessage,
    isSubmitting: isAuthSubmitting,
    authChangeKey,
    clearError: clearAuthError,
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
    artifactLoadStates,
    isGenerating,
    activeSessionId,
    sessionMode,
    sessionTitle,
    brainstormType,
    prepareGuestWorkspace,
    preparePersistedWorkspace,
    updateBrainstormType,
    ensureArtifactContent,
    downloadArtifact,
    downloadAllArtifacts,
    autoStartError,
    clearAutoStartError,
    intensityRef,
    selectedFlashModel,
    setSelectedFlashModel,
    selectedTools,
    setSelectedTools,
    start,
    stop,
    sendText,
  } = useGeminiBrainstorm()
  const {
    sessions: librarySessions,
    isLoading: isLibraryLoading,
    errorMessage: libraryErrorMessage,
    activeAction: libraryActiveAction,
    activeSessionId: libraryActiveSessionId,
    clearError: clearLibraryError,
    createSession,
    reopenSession,
    deleteSession,
  } = useBrainstormSessionLibrary({ status: authStatus, user })

  const [inputText, setInputText] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [hasGuestAccess, setHasGuestAccess] = useState(false)
  const [grantedSignedInAuthChangeKey, setGrantedSignedInAuthChangeKey] = useState<number | null>(null)
  const [showModeSelection, setShowModeSelection] = useState(false)
  // Track whether mode selection is for a new signed-in session (deferred creation)
  const [pendingNewSession, setPendingNewSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasSignedInWorkspaceAccess =
    authStatus === 'signed_in'
    && grantedSignedInAuthChangeKey === authChangeKey

  const isEntryModalOpen =
    authStatus === 'loading'
      ? true
      : authStatus === 'signed_in'
        ? !hasSignedInWorkspaceAccess
        : !hasGuestAccess

  const clearEntryError = useCallback(() => {
    clearAuthError()
    clearLibraryError()
  }, [clearAuthError, clearLibraryError])

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

  useEffect(() => {
    if (!selectedArtifact) {
      return
    }

    void ensureArtifactContent(selectedArtifact)
  }, [ensureArtifactContent, selectedArtifact])

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

  const handleContinueAsGuest = useCallback(() => {
    clearEntryError()
    prepareGuestWorkspace()
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(true)
    updateBrainstormType(null)
    setPendingNewSession(false)
    setShowModeSelection(true)
  }, [clearEntryError, prepareGuestWorkspace, updateBrainstormType])

  const handleCreateSession = useCallback(async () => {
    clearEntryError()
    // Defer actual session creation until after mode selection.
    // Grant workspace access now so the mode selection screen appears.
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(false)
    setGrantedSignedInAuthChangeKey(authChangeKey)
    updateBrainstormType(null)
    setPendingNewSession(true)
    setShowModeSelection(true)
  }, [authChangeKey, clearEntryError, updateBrainstormType])

  const handleReopenSession = useCallback(async (sessionId: string) => {
    clearEntryError()
    const session = await reopenSession(sessionId)
    if (!session) {
      return
    }
    // Read brainstorm_type from session record; default to open_studio for legacy sessions
    const sessionBrainstormType = (session.brainstormType === 'creative_spark' ? 'creative_spark' : 'open_studio') as BrainstormType
    await preparePersistedWorkspace(session.id, {
      title: session.title,
      restoreTurns: true,
      brainstormType: sessionBrainstormType,
    })
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(false)
    setGrantedSignedInAuthChangeKey(authChangeKey)
    // Resuming an existing session — skip mode selection, use stored brainstorm_type
    updateBrainstormType(sessionBrainstormType)
    setPendingNewSession(false)
    setShowModeSelection(false)
  }, [authChangeKey, clearEntryError, preparePersistedWorkspace, reopenSession, updateBrainstormType])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    clearEntryError()
    await deleteSession(sessionId)
  }, [clearEntryError, deleteSession])

  const handleSelectMode = useCallback(async (mode: BrainstormType) => {
    updateBrainstormType(mode)

    // For signed-in users with a pending new session, create it now with the chosen mode
    if (pendingNewSession) {
      setPendingNewSession(false)
      const session = await createSession(mode)
      if (!session) {
        // Session creation failed — stay on mode selection so user can retry
        updateBrainstormType(null)
        return
      }
      await preparePersistedWorkspace(session.id, {
        title: session.title,
        restoreTurns: false,
        brainstormType: mode,
      })
    }

    setShowModeSelection(false)
  }, [pendingNewSession, createSession, preparePersistedWorkspace, updateBrainstormType])

  const handleGoBackToModeSelection = useCallback(() => {
    stop()
    clearAutoStartError()
    updateBrainstormType(null)
    setShowModeSelection(true)
  }, [stop, clearAutoStartError, updateBrainstormType])

  const handleCreateShare = useCallback(async (): Promise<string | null> => {
    if (sessionMode !== 'persisted' || !activeSessionId) return null
    try {
      const share = await createBrainstormShare(activeSessionId)
      const shareUrl = `${window.location.origin}${window.location.pathname}#/share/${share.shareToken}`
      return shareUrl
    } catch (error) {
      console.error('Failed to create share link:', error)
      return null
    }
  }, [activeSessionId, sessionMode])

  const artifactList = Array.from(artifacts.entries())
  const totalSize = artifactList.reduce(
    (acc, [, artifact]) => acc + getArtifactSize(artifact),
    0,
  )

  const currentArtifact =
    selectedArtifact !== null ? artifacts.get(selectedArtifact) ?? null : null
  const selectedArtifactLoadState =
    selectedArtifact !== null ? artifactLoadStates[selectedArtifact] ?? null : null

  const onCreateShare = sessionMode === 'persisted' ? handleCreateShare : undefined

  const sharedProps: BrainstormLayoutProps = {
    brainstormType,
    intensityRef,
    isConnected,
    isStarting,
    messages,
    artifactList,
    totalSize,
    isGenerating,
    inputText,
    selectedArtifact,
    currentArtifact,
    selectedArtifactLoadState,
    sessionTitle,
    selectedFlashModel,
    setSelectedFlashModel,
    selectedTools,
    setSelectedTools,
    messagesEndRef,
    setInputText,
    setSelectedArtifact,
    downloadArtifact,
    downloadAllArtifacts,
    handleSend,
    handleConnect,
    stop,
    onCreateShare,
    autoStartError,
    clearAutoStartError,
    onGoBack: handleGoBackToModeSelection,
  }

  const isOverlayActive = isEntryModalOpen || showModeSelection

  return (
    <>
      <div
        aria-hidden={isOverlayActive}
        inert={isOverlayActive}
        className={isOverlayActive ? 'pointer-events-none select-none blur-[2px] saturate-75' : ''}
      >
        {brainstormType === 'creative_spark' ? (
          isMobileLayout ? (
            <CreativeSparkMobileLayout {...sharedProps} />
          ) : (
            <CreativeSparkDesktopLayout {...sharedProps} />
          )
        ) : (
          isMobileLayout ? (
            <BrainstormMobileLayout {...sharedProps} />
          ) : (
            <BrainstormDesktopLayout {...sharedProps} />
          )
        )}
      </div>

      <AnimatePresence mode="wait">
        {showModeSelection && !isEntryModalOpen && (
          <ModeSelectionScreen
            key="mode-selection"
            onSelectMode={handleSelectMode}
          />
        )}
      </AnimatePresence>

      {isEntryModalOpen && (
        <BrainstormEntryModal
          status={authStatus}
          user={user}
          isSubmitting={isAuthSubmitting}
          errorMessage={authStatus === 'signed_in' ? libraryErrorMessage ?? errorMessage : errorMessage}
          librarySessions={librarySessions}
          isLibraryLoading={isLibraryLoading}
          libraryActiveAction={libraryActiveAction}
          libraryActiveSessionId={libraryActiveSessionId}
          onClearError={clearEntryError}
          onContinueAsGuest={handleContinueAsGuest}
          onCreateSession={handleCreateSession}
          onReopenSession={handleReopenSession}
          onDeleteSession={handleDeleteSession}
          onSignInWithPassword={signInWithPassword}
          onSignUpWithPassword={signUpWithPassword}
          onSignInWithGoogle={signInWithGoogle}
          onSignOut={signOutFromBrainstorm}
        />
      )}
    </>
  )
}
