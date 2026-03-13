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
  Zap,
  Clock,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useWebHaptics } from 'web-haptics/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'
import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { PulseDot } from '@/components/landing/PulseDot'
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

const EASE = [0.22, 1, 0.36, 1] as const

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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0c1229]/94 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-3xl max-h-[calc(100dvh-2rem)]"
    >
      <BorderBeam
        colorFrom="#f59e0b"
        colorTo="#ea580c"
        size={80}
        duration={8}
        borderWidth={1}
      />
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-amber-400/[0.06] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
      />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <BlurFade delay={0.05}>
          <Badge
            variant="outline"
            className="h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-[10px] font-medium tracking-widest text-amber-200 uppercase"
          >
            <PulseDot />
            Brainstorm Mode
          </Badge>
        </BlurFade>

        <BlurFade delay={0.12}>
          <div className="flex size-16 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
            <Loader2 className="size-7 animate-spin text-amber-300" />
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <div>
            <h2
              id="brainstorm-entry-loading-title"
              className="text-2xl font-semibold tracking-tight text-slate-100"
            >
              <AnimatedGradientText
                colorFrom="#f59e0b"
                colorTo="#ea580c"
                speed={2}
                className="text-2xl font-semibold tracking-tight"
              >
                Preparing your studio
              </AnimatedGradientText>
            </h2>
            <p
              id="brainstorm-entry-loading-description"
              className="mt-3 text-sm leading-6 text-slate-400"
            >
              Restoring your creative session — hang tight.
            </p>
          </div>
        </BlurFade>
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
  const haptic = useWebHaptics()
  const displayName =
    user?.displayName?.trim() ?? user?.email?.split('@')[0] ?? 'Creative'
  const avatarLabel = displayName.charAt(0).toUpperCase()
  const isCreating = activeAction === 'create'
  const isBusy = isSubmitting || isLoading || activeAction !== null
  const hasSessions = sessions.length > 0

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0c1229]/94 shadow-[0_32px_80px_rgba(0,0,0,0.62)] backdrop-blur-3xl max-h-[calc(100dvh-2rem)]"
    >
      <BorderBeam
        colorFrom="#f59e0b"
        colorTo="#ea580c"
        size={100}
        duration={10}
        borderWidth={1}
      />
      <DotPattern
        width={28}
        height={28}
        cr={0.7}
        className="text-amber-400/[0.05] [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_60%)]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.12),_transparent_45%)]" />

      <div className="relative overflow-y-auto p-5 sm:p-6 md:p-8 max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <BlurFade delay={0.05}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/25 to-orange-500/15 text-lg font-bold text-white shadow-[0_12px_40px_rgba(245,158,11,0.18)]">
                {avatarLabel}
              </div>
              <div>
                <Badge
                  variant="outline"
                  className="mb-1.5 h-auto gap-1.5 rounded-full border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-medium tracking-widest text-amber-200 uppercase"
                >
                  <PulseDot />
                  Your Studio
                </Badge>
                <h2
                  id="brainstorm-entry-library-title"
                  className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl"
                >
                  Welcome back, {displayName}
                </h2>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                haptic.trigger('light')
                void onSignOut()
              }}
              disabled={isBusy}
              className="rounded-xl border-white/[0.1] bg-white/[0.03] text-xs text-slate-300 hover:bg-white/[0.06]"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5" />
              )}
              Sign out
            </Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p
            id="brainstorm-entry-library-description"
            className="mt-3 text-sm leading-6 text-slate-400"
          >
            Pick up where you left off or start something new.
          </p>
        </BlurFade>

        {/* Stats row */}
        <BlurFade delay={0.15}>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Signed in as
              </p>
              <p className="mt-2 truncate text-sm font-medium text-slate-100">
                {user?.email ?? 'Google account'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Creative sessions
              </p>
              <p className="mt-2 text-sm font-medium text-amber-200">
                {sessions.length === 0
                  ? 'None yet'
                  : sessions.length === 1
                    ? '1 session'
                    : `${sessions.length} sessions`}
              </p>
            </div>
          </div>
        </BlurFade>

        {/* Error */}
        {errorMessage && (
          <BlurFade delay={0.08}>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
              <span>{errorMessage}</span>
            </div>
          </BlurFade>
        )}

        {/* New session CTA */}
        <BlurFade delay={0.2}>
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Button
              onClick={() => {
                haptic.trigger('success')
                void onCreateSession()
              }}
              disabled={isBusy}
              className="mt-5 min-h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(217,119,6,0.28)] hover:brightness-110"
            >
              {isCreating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Start a new brainstorm
            </Button>
          </motion.div>
        </BlurFade>

        {/* Session library */}
        <BlurFade delay={0.25}>
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                {hasSessions ? 'Your sessions' : 'No sessions yet'}
              </h3>
              {isLoading ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-amber-300" />
              ) : null}
            </div>

            {isLoading ? (
              <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.02] px-6 text-center">
                <Loader2 className="size-7 animate-spin text-amber-300" />
                <p className="mt-3 text-sm font-medium text-slate-200">
                  Loading your sessions…
                </p>
              </div>
            ) : hasSessions ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {sessions.map((session, i) => {
                  const isOpening =
                    activeAction === 'open' && activeSessionId === session.id
                  const isDeleting =
                    activeAction === 'delete' &&
                    activeSessionId === session.id

                  return (
                    <BlurFade key={session.id} delay={0.3 + i * 0.06}>
                      <MagicCard
                        className="rounded-2xl"
                        gradientColor="#1c1917"
                        gradientFrom="#d97706"
                        gradientTo="#92400e"
                        gradientOpacity={0.5}
                      >
                        <article className="flex min-h-[160px] flex-col p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Sparkles className="size-3.5 shrink-0 text-amber-400" />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/70">
                                  Session
                                </p>
                              </div>
                              <h4 className="mt-2 truncate text-base font-semibold text-slate-100">
                                {session.title}
                              </h4>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="size-3" />
                            <span>
                              Updated{' '}
                              {formatSessionTimestamp(session.updatedAt)}
                            </span>
                          </div>

                          <div className="mt-auto flex gap-2 pt-4">
                            <motion.div
                              className="flex-1"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Button
                                onClick={() => {
                                  haptic.trigger('selection')
                                  void onReopenSession(session.id)
                                }}
                                disabled={isBusy}
                                className="min-h-10 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(217,119,6,0.22)] hover:brightness-110"
                              >
                                {isOpening ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <FolderOpen className="size-3.5" />
                                )}
                                Reopen
                              </Button>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  haptic.trigger('warning')
                                  void onDeleteSession(session.id)
                                }}
                                disabled={isBusy}
                                className="size-10 rounded-xl border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20"
                              >
                                {isDeleting ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </Button>
                            </motion.div>
                          </div>
                        </article>
                      </MagicCard>
                    </BlurFade>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 shadow-[0_8px_24px_rgba(245,158,11,0.1)]">
                  <FolderOpen className="size-5 text-amber-200" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-200">
                  Your library is empty
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  Start a new brainstorm above and your sessions will appear
                  here.
                </p>
              </div>
            )}
          </div>
        </BlurFade>
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
  const haptic = useWebHaptics()
  const [authMode, setAuthMode] = useState<AuthMode>('sign_up')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const tabIndicatorRef = useRef<HTMLDivElement>(null)

  const activeError = fieldError ?? errorMessage

  const modalTitle = useMemo(() => {
    if (status === 'loading') {
      return 'Preparing your studio'
    }

    if (status === 'signed_in') {
      return 'Brainstorm library'
    }

    return 'Enter the studio'
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
      haptic.trigger('error')
      return
    }

    setFieldError(null)
    haptic.trigger('selection')

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
    haptic.trigger('selection')

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#060818]/90 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.06),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.08),_transparent_45%)]" />

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0c1229]/94 shadow-[0_32px_80px_rgba(0,0,0,0.62)] backdrop-blur-3xl max-h-[calc(100dvh-2rem)]"
          >
            <BorderBeam
              colorFrom="#f59e0b"
              colorTo="#ea580c"
              size={90}
              duration={9}
              borderWidth={1}
            />
            <DotPattern
              width={26}
              height={26}
              cr={0.7}
              className="text-amber-400/[0.04] [mask-image:radial-gradient(ellipse_at_top,black_25%,transparent_65%)]"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.12),_transparent_42%)]" />

            <div className="relative overflow-y-auto p-5 sm:p-6 md:p-8 max-h-[calc(100dvh-2rem)]">
              {/* Header */}
              <BlurFade delay={0.05}>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/25 to-orange-600/20 shadow-[0_12px_40px_rgba(245,158,11,0.18)]">
                    <Sparkles className="size-5 text-amber-100" />
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-1 h-auto gap-1.5 rounded-full border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-medium tracking-widest text-amber-200 uppercase"
                    >
                      <PulseDot />
                      Brainstorm Mode
                    </Badge>
                    <h1
                      id="brainstorm-entry-title"
                      className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl"
                    >
                      <AnimatedGradientText
                        colorFrom="#f59e0b"
                        colorTo="#ea580c"
                        speed={2}
                        className="text-xl font-semibold tracking-tight sm:text-2xl"
                      >
                        {modalTitle}
                      </AnimatedGradientText>
                    </h1>
                  </div>
                </div>
              </BlurFade>

              <BlurFade delay={0.1}>
                <p
                  id="brainstorm-entry-description"
                  className="mt-4 text-sm leading-7 text-slate-300"
                >
                  Voice-powered creative workspace. Sign in to save your
                  sessions, or jump in as a guest to explore freely.
                </p>
              </BlurFade>

              {/* Feature highlights */}
              <BlurFade delay={0.15}>
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    {
                      icon: <Sparkles className="size-3.5 text-amber-300" />,
                      label: 'Voice ideation',
                    },
                    {
                      icon: <Zap className="size-3.5 text-orange-300" />,
                      label: 'AI artifacts',
                    },
                    {
                      icon: <FolderOpen className="size-3.5 text-amber-300" />,
                      label: 'Saved sessions',
                    },
                    {
                      icon: <ArrowRight className="size-3.5 text-orange-300" />,
                      label: 'Instant export',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2"
                    >
                      {item.icon}
                      <span className="text-xs font-medium text-slate-300">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </BlurFade>

              {/* Auth section */}
              <BlurFade delay={0.2}>
                <div className="mt-6 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl sm:p-6">
                  {/* Auth toggle */}
                  <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-black/25 p-1">
                    <motion.div
                      ref={tabIndicatorRef}
                      layoutId="auth-tab-indicator"
                      className="absolute inset-y-1 w-[calc(50%-2px)] rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/15 shadow-[0_0_24px_rgba(245,158,11,0.1)]"
                      animate={{
                        x: authMode === 'sign_up' ? 4 : 'calc(100% + 4px)',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                    {[
                      { id: 'sign_up' as const, label: 'Sign up' },
                      { id: 'sign_in' as const, label: 'Sign in' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          haptic.trigger('selection')
                          setAuthMode(option.id)
                          setFieldError(null)
                          onClearError()
                        }}
                        className={cn(
                          'relative z-10 min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors',
                          authMode === option.id
                            ? 'text-amber-100'
                            : 'text-slate-400 hover:text-slate-200',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Google sign-in */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        void handleGoogleSignIn()
                      }}
                      disabled={isSubmitting}
                      className="mt-4 min-h-11 w-full rounded-xl border-white/[0.1] bg-white/[0.04] text-sm text-slate-100 hover:bg-white/[0.08]"
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <GoogleGlyph />
                      )}
                      Continue with Google
                    </Button>
                  </motion.div>

                  {/* Divider */}
                  <div className="mt-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    <span className="h-px flex-1 bg-white/[0.08]" />
                    or use email
                    <span className="h-px flex-1 bg-white/[0.08]" />
                  </div>

                  {/* Form fields */}
                  <div className="mt-4 space-y-3">
                    <AnimatePresence mode="wait">
                      {authMode === 'sign_up' && (
                        <motion.label
                          key="display-name-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: EASE }}
                          className="block space-y-1.5 overflow-hidden"
                        >
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
                            className="min-h-11 rounded-xl border-white/[0.08] bg-[#0b1120] px-4 text-sm text-slate-100 placeholder:text-slate-500"
                          />
                        </motion.label>
                      )}
                    </AnimatePresence>

                    <label className="block space-y-1.5">
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
                        className="min-h-11 rounded-xl border-white/[0.08] bg-[#0b1120] px-4 text-sm text-slate-100 placeholder:text-slate-500"
                      />
                    </label>

                    <label className="block space-y-1.5">
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
                        placeholder={
                          authMode === 'sign_up'
                            ? 'At least 6 characters'
                            : 'Enter your password'
                        }
                        aria-invalid={activeError ? 'true' : 'false'}
                        className="min-h-11 rounded-xl border-white/[0.08] bg-[#0b1120] px-4 text-sm text-slate-100 placeholder:text-slate-500"
                      />
                    </label>

                    <AnimatePresence mode="wait">
                      {authMode === 'sign_up' && (
                        <motion.label
                          key="confirm-password-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: EASE }}
                          className="block space-y-1.5 overflow-hidden"
                        >
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
                            className="min-h-11 rounded-xl border-white/[0.08] bg-[#0b1120] px-4 text-sm text-slate-100 placeholder:text-slate-500"
                          />
                        </motion.label>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error display */}
                  {activeError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
                      <span>{activeError}</span>
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Button
                      onClick={() => {
                        void handleSubmit()
                      }}
                      disabled={isSubmitting}
                      className="mt-4 min-h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(217,119,6,0.28)] hover:brightness-110"
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                      {authMode === 'sign_up'
                        ? 'Create account'
                        : 'Sign in'}
                    </Button>
                  </motion.div>

                  <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                    {authMode === 'sign_up'
                      ? 'Save brainstorms, revisit sessions, and share your ideas.'
                      : 'Pick up right where you left off in your creative library.'}
                  </p>
                </div>
              </BlurFade>

              {/* Guest CTA */}
              <BlurFade delay={0.28}>
                <div className="mt-5 rounded-[1.2rem] border border-amber-400/10 bg-gradient-to-br from-amber-500/8 to-orange-600/6 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-500/10">
                      <UserRound className="size-4 text-amber-200" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-100">
                        Just want to explore?
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Guest sessions are fully ephemeral — nothing is saved
                        after you close the tab.
                      </p>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Button
                      onClick={() => {
                        haptic.trigger('light')
                        onContinueAsGuest()
                      }}
                      disabled={isSubmitting}
                      variant="outline"
                      className="mt-3 min-h-10 w-full rounded-xl border-amber-500/15 bg-amber-500/8 text-sm font-semibold text-amber-100 hover:bg-amber-500/15 hover:border-amber-500/25"
                    >
                      Continue as guest
                      <ArrowRight className="size-4" />
                    </Button>
                  </motion.div>
                </div>
              </BlurFade>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
