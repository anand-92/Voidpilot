import { useCallback, useEffect, useRef, useState } from 'react'
import { BrainstormEntryModal } from '../components/brainstorm/BrainstormEntryModal'
import { BrainstormDesktopLayout, BrainstormMobileLayout, type BrainstormLayoutProps } from '../components/brainstorm/BrainstormLayouts'
import { getArtifactSize } from '../components/brainstorm/utils'
import { useBrainstormEntryAuth } from '../hooks/useBrainstormEntryAuth'
import { useGeminiBrainstorm } from '../hooks/useGeminiBrainstorm'
import { useBrainstormSessionLibrary } from '../hooks/useBrainstormSessionLibrary'

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
    isGenerating,
    prepareGuestWorkspace,
    preparePersistedWorkspace,
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
  }, [clearEntryError, prepareGuestWorkspace])

  const handleCreateSession = useCallback(async () => {
    clearEntryError()
    const session = await createSession()
    if (!session) {
      return
    }
    preparePersistedWorkspace(session.id)
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(false)
    setGrantedSignedInAuthChangeKey(authChangeKey)
  }, [authChangeKey, clearEntryError, createSession, preparePersistedWorkspace])

  const handleReopenSession = useCallback(async (sessionId: string) => {
    clearEntryError()
    const session = await reopenSession(sessionId)
    if (!session) {
      return
    }
    preparePersistedWorkspace(session.id)
    setInputText('')
    setSelectedArtifact(null)
    setHasGuestAccess(false)
    setGrantedSignedInAuthChangeKey(authChangeKey)
  }, [authChangeKey, clearEntryError, preparePersistedWorkspace, reopenSession])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    clearEntryError()
    await deleteSession(sessionId)
  }, [clearEntryError, deleteSession])

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
