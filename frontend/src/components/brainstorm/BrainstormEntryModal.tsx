import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CircleAlert,
  FolderOpen,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  BrainstormLibraryAction,
  BrainstormLibrarySession,
} from '@/hooks/useBrainstormSessionLibrary'
import type {
  BrainstormEntryAuthStatus,
  BrainstormEntryAuthUser,
} from '@/hooks/useBrainstormEntryAuth'

type BrainstormEntryModalProps = {
  status: BrainstormEntryAuthStatus
  user: BrainstormEntryAuthUser | null
  isSubmitting: boolean
  errorMessage: string | null
  librarySessions: BrainstormLibrarySession[]
  isLibraryLoading: boolean
  libraryActiveAction: BrainstormLibraryAction
  libraryActiveSessionId: string | null
  onClearError: () => void
  onContinueAsGuest: () => void
  onCreateSession: () => Promise<void>
  onReopenSession: (sessionId: string) => Promise<void>
  onDeleteSession: (sessionId: string) => Promise<void>
  onSignInWithPassword: (email: string, password: string) => Promise<void>
  onSignUpWithPassword: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>
  onSignInWithGoogle: () => Promise<void>
  onSignOut: () => Promise<void>
}

type AuthMode = 'sign_up' | 'sign_in'

const MODAL_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#EA4335"
        d="M12.24 10.285V14.4h5.885c-.26 1.33-1.563 3.9-5.885 3.9-3.542 0-6.427-2.93-6.427-6.54s2.885-6.54 6.427-6.54c2.017 0 3.365.86 4.14 1.604l2.82-2.72C17.44 2.46 15.13 1.5 12.24 1.5 6.945 1.5 2.64 5.805 2.64 11.1s4.305 9.6 9.6 9.6c5.54 0 9.21-3.89 9.21-9.365 0-.63-.07-1.11-.155-1.55H12.24Z"
      />
      <path
        fill="#FBBC05"
        d="M3.745 6.655 7.13 9.135c.915-1.815 2.8-3.08 5.11-3.08 2.017 0 3.365.86 4.14 1.605l2.82-2.72C17.44 2.46 15.13 1.5 12.24 1.5c-3.69 0-6.87 2.105-8.495 5.155Z"
      />
      <path
        fill="#34A853"
        d="M12.24 20.7c2.82 0 5.19-.93 6.92-2.52l-3.195-2.61c-.855.595-2 1.01-3.725 1.01-4.14 0-5.435-2.585-5.79-3.875l-3.36 2.59C4.69 18.48 8.13 20.7 12.24 20.7Z"
      />
      <path
        fill="#4285F4"
        d="M3.09 15.295 6.45 12.705c-.18-.535-.285-1.105-.285-1.705 0-.6.105-1.17.285-1.705l-3.36-2.59A9.656 9.656 0 0 0 2.64 11.1c0 1.57.375 3.06 1.05 4.195Z"
      />
    </svg>
  )
}

function LoadingState() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={MODAL_TRANSITION}
      className="relative my-auto w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/[0.08] bg-[#0c1229]/92 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-3xl max-h-[calc(100dvh-2rem)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.14),_transparent_42%)]" />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.12)]">
          <Loader2 className="size-7 animate-spin text-amber-300" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
            Brainstorm Entry
          </p>
          <h2 id="brainstorm-entry-loading-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
            Checking your brainstorm access
          </h2>
          <p id="brainstorm-entry-loading-description" className="mt-2 text-sm leading-6 text-slate-400">
            Restoring your signed-in state before any workspace controls unlock.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function formatSessionTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function LibraryState({
  user,
  isSubmitting,
  errorMessage,
  sessions,
  isLoading,
  activeAction,
  activeSessionId,
  onCreateSession,
  onReopenSession,
  onDeleteSession,
  onSignOut,
}: {
  user: BrainstormEntryAuthUser | null
  isSubmitting: boolean
  errorMessage: string | null
  sessions: BrainstormLibrarySession[]
  isLoading: boolean
  activeAction: BrainstormLibraryAction
  activeSessionId: string | null
  onCreateSession: () => Promise<void>
  onReopenSession: (sessionId: string) => Promise<void>
  onDeleteSession: (sessionId: string) => Promise<void>
  onSignOut: () => Promise<void>
}) {
  const displayName =
    user?.displayName?.trim() ?? user?.email?.split('@')[0] ?? 'Brainstorm operator'
  const avatarLabel = displayName.charAt(0).toUpperCase()
  const isCreating = activeAction === 'create'
  const isBusy = isSubmitting || isLoading || activeAction !== null
  const hasSessions = sessions.length > 0

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={MODAL_TRANSITION}
      className="relative my-auto w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/[0.08] bg-[#0c1229]/94 shadow-[0_32px_80px_rgba(0,0,0,0.62)] backdrop-blur-3xl max-h-[calc(100dvh-2rem)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.18),_transparent_38%)]" />

      <div className="relative grid gap-6 p-6 md:grid-cols-[0.95fr,1.05fr] md:p-8">
        <section className="rounded-[1.6rem] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/25 to-orange-500/15 text-lg font-bold text-white shadow-[0_12px_40px_rgba(245,158,11,0.18)]">
              {avatarLabel}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
                Brainstorm Library
              </p>
              <h2 id="brainstorm-entry-library-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
                Welcome back, {displayName}
              </h2>
              <p id="brainstorm-entry-library-description" className="mt-1 text-sm text-slate-400">
                You are back in the signed-in library flow before any workspace session begins.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Signed in as
              </p>
              <p className="mt-2 text-sm font-medium text-slate-100">{user?.email ?? 'Google account'}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Saved sessions
              </p>
              <p className="mt-2 text-sm font-medium text-amber-200">
                {sessions.length === 1 ? '1 saved session' : `${sessions.length} saved sessions`}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              'Create a fresh persisted session before the workspace unlocks.',
              'Reopen an existing session from here instead of jumping straight into live controls.',
              'Delete only the session you no longer want without disturbing the rest of your library.',
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => {
                void onCreateSession()
              }}
              disabled={isBusy}
              className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(217,119,6,0.28)] hover:brightness-110"
            >
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              New session
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                void onSignOut()
              }}
              disabled={isBusy}
              className="min-h-12 rounded-2xl border-white/[0.1] bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Sign out
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[1.6rem] border border-white/[0.06] bg-black/25 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Session library
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">
                {hasSessions ? 'Reopen a saved brainstorm' : 'No saved brainstorms yet'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {hasSessions
                  ? 'Choose a session to reopen, or create a clean one from scratch.'
                  : 'Create your first saved brainstorm session to enter a clean workspace.'}
              </p>
            </div>

            {isLoading ? <Loader2 className="size-5 shrink-0 animate-spin text-amber-300" /> : null}
          </div>

          {isLoading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-white/[0.05] bg-white/[0.03] px-6 text-center">
              <Loader2 className="size-8 animate-spin text-amber-300" />
              <p className="mt-4 text-sm font-medium text-slate-100">Loading your brainstorm sessions</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                Restoring the signed-in library before the workspace can unlock.
              </p>
            </div>
          ) : hasSessions ? (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isOpening =
                  activeAction === 'open' && activeSessionId === session.id
                const isDeleting =
                  activeAction === 'delete' && activeSessionId === session.id

                return (
                  <article
                    key={session.id}
                    className="rounded-[1.4rem] border border-white/[0.06] bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">
                          Persisted session
                        </p>
                        <h4 className="mt-2 truncate text-base font-semibold text-slate-100">
                          {session.title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          Updated {formatSessionTimestamp(session.updatedAt)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Created
                        </p>
                        <p className="mt-1 text-sm text-slate-200">
                          {formatSessionTimestamp(session.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Button
                        onClick={() => {
                          void onReopenSession(session.id)
                        }}
                        disabled={isBusy}
                        className="min-h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(217,119,6,0.24)] hover:brightness-110"
                      >
                        {isOpening ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
                        Reopen
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          void onDeleteSession(session.id)
                        }}
                        disabled={isBusy}
                        className="min-h-11 rounded-2xl border-white/[0.1] bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        Delete
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/[0.08] bg-white/[0.03] px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 shadow-[0_12px_32px_rgba(245,158,11,0.12)]">
                <FolderOpen className="size-6 text-amber-200" />
              </div>
              <h4 className="mt-5 text-lg font-semibold text-slate-100">Your library is empty</h4>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                Start a new persisted brainstorm session and you will enter a clean workspace with no transcript or artifact carryover.
              </p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  )
}

export function BrainstormEntryModal({
  status,
  user,
  isSubmitting,
  errorMessage,
  librarySessions,
  isLibraryLoading,
  libraryActiveAction,
  libraryActiveSessionId,
  onClearError,
  onContinueAsGuest,
  onCreateSession,
  onReopenSession,
  onDeleteSession,
  onSignInWithPassword,
  onSignUpWithPassword,
  onSignInWithGoogle,
  onSignOut,
}: BrainstormEntryModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('sign_up')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const activeError = fieldError ?? errorMessage

  const modalTitle = useMemo(() => {
    if (status === 'loading') {
      return 'Checking your brainstorm access'
    }

    if (status === 'signed_in') {
      return 'Brainstorm library'
    }

    return 'Enter brainstorm mode'
  }, [status])

  const dialogLabelledBy =
    status === 'loading'
      ? 'brainstorm-entry-loading-title'
      : status === 'signed_in'
        ? 'brainstorm-entry-library-title'
        : 'brainstorm-entry-title'

  const dialogDescribedBy =
    status === 'loading'
      ? 'brainstorm-entry-loading-description'
      : status === 'signed_in'
        ? 'brainstorm-entry-library-description'
        : 'brainstorm-entry-description'

  const validateForm = () => {
    const trimmedEmail = email.trim()
    const trimmedDisplayName = displayName.trim()

    if (!trimmedEmail) {
      return 'Enter your email address.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'Use a valid email address.'
    }

    if (!password) {
      return 'Enter your password.'
    }

    if (authMode === 'sign_up') {
      if (password.length < 6) {
        return 'Use a password with at least 6 characters.'
      }

      if (confirmPassword !== password) {
        return 'The password confirmation does not match.'
      }

      if (trimmedDisplayName.length > 40) {
        return 'Keep your display name under 40 characters.'
      }
    }

    return null
  }

  const handleSubmit = async () => {
    const nextFieldError = validateForm()
    if (nextFieldError) {
      setFieldError(nextFieldError)
      return
    }

    setFieldError(null)

    try {
      if (authMode === 'sign_up') {
        await onSignUpWithPassword(email.trim(), password, displayName.trim())
      } else {
        await onSignInWithPassword(email.trim(), password)
      }
    } catch {
      // Error state is surfaced by the auth hook.
    }
  }

  const handleGoogleSignIn = async () => {
    setFieldError(null)

    try {
      await onSignInWithGoogle()
    } catch {
      // Error state is surfaced by the auth hook.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogLabelledBy}
      aria-describedby={dialogDescribedBy}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain p-4 sm:items-center sm:p-6"
    >
      <div className="absolute inset-0 bg-[#060818]/88 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.08),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.1),_transparent_40%)]" />

      <AnimatePresence mode="wait">
        {status === 'loading' ? (
          <LoadingState key="loading-state" />
        ) : status === 'signed_in' ? (
          <LibraryState
            key="library-state"
            user={user}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            sessions={librarySessions}
            isLoading={isLibraryLoading}
            activeAction={libraryActiveAction}
            activeSessionId={libraryActiveSessionId}
            onCreateSession={onCreateSession}
            onReopenSession={onReopenSession}
            onDeleteSession={onDeleteSession}
            onSignOut={onSignOut}
          />
        ) : (
          <motion.div
            key="entry-state"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={MODAL_TRANSITION}
            className="relative my-auto w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/[0.08] bg-[#0c1229]/94 shadow-[0_32px_80px_rgba(0,0,0,0.62)] backdrop-blur-3xl max-h-[calc(100dvh-2rem)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.16),_transparent_40%)]" />

            <div className="relative grid gap-6 p-4 sm:p-6 md:grid-cols-[1.08fr,0.92fr] md:p-8">
              <section className="flex flex-col rounded-[1.8rem] border border-white/[0.06] bg-black/25 p-6 backdrop-blur-xl md:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/25 to-orange-600/20 shadow-[0_12px_40px_rgba(245,158,11,0.18)]">
                    <Sparkles className="size-5 text-amber-100" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
                      Brainstorm Mode
                    </p>
                    <h1 id="brainstorm-entry-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
                      {modalTitle}
                    </h1>
                  </div>
                </div>

                <p id="brainstorm-entry-description" className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
                  A deliberate entry step now gates the workspace so auth, guest mode, and future saved-session flows all start from one polished launch surface.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: <Mail className="size-4 text-amber-300" />,
                      title: 'Email + password',
                      body: 'Create an account or sign in without ever leaving brainstorm.',
                    },
                    {
                      icon: <GoogleGlyph />,
                      title: 'Google sign-in',
                      body: 'Jump back into the signed-in brainstorm flow with a popup sign-in.',
                    },
                    {
                      icon: <UserRound className="size-4 text-amber-300" />,
                      title: 'Guest access',
                      body: 'Open the workspace instantly, but nothing survives a refresh or close.',
                    },
                    {
                      icon: <ArrowRight className="size-4 text-amber-300" />,
                      title: 'Library-first restore',
                      body: 'Returning signed-in users re-enter through the modal instead of dropping into live controls.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4"
                    >
                      <div className="flex size-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/20">
                        {item.icon}
                      </div>
                      <h2 className="mt-3 text-sm font-semibold text-slate-100">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-amber-400/15 bg-gradient-to-br from-amber-500/12 to-orange-600/10 p-5 shadow-[0_18px_40px_rgba(217,119,6,0.12)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/80">
                    Continue as guest
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Guest sessions stay fully ephemeral. Refresh the page, close the tab, or come back later and they are gone.
                  </p>
                  <Button
                    onClick={onContinueAsGuest}
                    disabled={isSubmitting}
                    className="mt-4 min-h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(217,119,6,0.28)] hover:brightness-110"
                  >
                    Continue as guest
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl md:p-7">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-black/20 p-1">
                  {[
                    { id: 'sign_up' as const, label: 'Sign up' },
                    { id: 'sign_in' as const, label: 'Sign in' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setAuthMode(option.id)
                        setFieldError(null)
                        onClearError()
                      }}
                      className={cn(
                        'min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors',
                        authMode === option.id
                          ? 'bg-amber-500/18 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.08)]'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    void handleGoogleSignIn()
                  }}
                  disabled={isSubmitting}
                  className="mt-5 min-h-12 w-full rounded-2xl border-white/[0.1] bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph />}
                  Continue with Google
                </Button>

                <div className="mt-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <span className="h-px flex-1 bg-white/[0.08]" />
                  or use email
                  <span className="h-px flex-1 bg-white/[0.08]" />
                </div>

                <div className="mt-5 space-y-4">
                  {authMode === 'sign_up' && (
                    <label className="block space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Display name
                      </span>
                      <Input
                        value={displayName}
                        onChange={(event) => {
                          setDisplayName(event.target.value)
                          setFieldError(null)
                          onClearError()
                        }}
                        placeholder="Your creative alias"
                        className="min-h-12 rounded-2xl border-white/[0.08] bg-[#0b1120] px-4 text-slate-100 placeholder:text-slate-500"
                      />
                    </label>
                  )}

                  <label className="block space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Email address
                    </span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        setFieldError(null)
                        onClearError()
                      }}
                      placeholder="name@example.com"
                      aria-invalid={activeError ? 'true' : 'false'}
                      className="min-h-12 rounded-2xl border-white/[0.08] bg-[#0b1120] px-4 text-slate-100 placeholder:text-slate-500"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Password
                    </span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setFieldError(null)
                        onClearError()
                      }}
                      placeholder={authMode === 'sign_up' ? 'At least 6 characters' : 'Enter your password'}
                      aria-invalid={activeError ? 'true' : 'false'}
                      className="min-h-12 rounded-2xl border-white/[0.08] bg-[#0b1120] px-4 text-slate-100 placeholder:text-slate-500"
                    />
                  </label>

                  {authMode === 'sign_up' && (
                    <label className="block space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Confirm password
                      </span>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value)
                          setFieldError(null)
                          onClearError()
                        }}
                        placeholder="Repeat your password"
                        aria-invalid={activeError ? 'true' : 'false'}
                        className="min-h-12 rounded-2xl border-white/[0.08] bg-[#0b1120] px-4 text-slate-100 placeholder:text-slate-500"
                      />
                    </label>
                  )}
                </div>

                {activeError && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
                    <span>{activeError}</span>
                  </div>
                )}

                <Button
                  onClick={() => {
                    void handleSubmit()
                  }}
                  disabled={isSubmitting}
                  className="mt-5 min-h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(217,119,6,0.28)] hover:brightness-110"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {authMode === 'sign_up' ? 'Create your brainstorm account' : 'Sign in to brainstorm'}
                </Button>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {authMode === 'sign_up'
                    ? 'A successful sign-up keeps you inside the brainstorm modal and restores the signed-in library state.'
                    : 'A successful sign-in returns you to the brainstorm library state instead of dropping into the workspace.'}
                </p>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
