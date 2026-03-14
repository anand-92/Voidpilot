import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BrainstormEntryModal } from '../components/brainstorm/BrainstormEntryModal'
import { BrainstormDesktopLayout, BrainstormMobileLayout, type BrainstormLayoutProps } from '../components/brainstorm/BrainstormLayouts'
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
    prepareGuestWorkspace,
    preparePersistedWorkspace,
    ensureArtifactContent,
    downloadArtifact,
    downloadAllArtifacts,
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
  const [brainstormType, setBrainstormType] = useState<BrainstormType | null>(null)
  const [showModeSelection, setShowModeSelection] = useState(false)
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
    setBrainstormType(null)
    setShowModeSelection(true)
  }, [clearEntryError, prepareGuestWorkspace])

  const handleCreateSession = useCallback(async () => {
    clearEntryError()
    const session = await createSession()
    if (!session) {
      return
    }
    await preparePersistedWorkspace(session.id, {
      title: session.title,
      restoreTurns: false,
    })
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(false)
    setGrantedSignedInAuthChangeKey(authChangeKey)
    setBrainstormType(null)
    setShowModeSelection(true)
  }, [authChangeKey, clearEntryError, createSession, preparePersistedWorkspace])

  const handleReopenSession = useCallback(async (sessionId: string) => {
    clearEntryError()
    const session = await reopenSession(sessionId)
    if (!session) {
      return
    }
    await preparePersistedWorkspace(session.id, {
      title: session.title,
      restoreTurns: true,
    })
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(false)
    setGrantedSignedInAuthChangeKey(authChangeKey)
    // Resuming an existing session — skip mode selection, default to open_studio.
    // Future work (mode-session-integration) will read brainstorm_type from session record.
    setBrainstormType('open_studio')
    setShowModeSelection(false)
  }, [authChangeKey, clearEntryError, preparePersistedWorkspace, reopenSession])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    clearEntryError()
    await deleteSession(sessionId)
  }, [clearEntryError, deleteSession])

  const handleSelectMode = useCallback((mode: BrainstormType) => {
    setBrainstormType(mode)
    setShowModeSelection(false)
  }, [])

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
  }

  const isOverlayActive = isEntryModalOpen || showModeSelection

  return (
    <>
      <div
        aria-hidden={isOverlayActive}
        inert={isOverlayActive}
        className={isOverlayActive ? 'pointer-events-none select-none blur-[2px] saturate-75' : ''}
      >
        {isMobileLayout ? (
          <BrainstormMobileLayout {...sharedProps} />
        ) : (
          <BrainstormDesktopLayout {...sharedProps} />
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
