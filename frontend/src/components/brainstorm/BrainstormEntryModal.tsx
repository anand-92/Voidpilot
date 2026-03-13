import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  CircleAlert,
  FolderOpen,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Trash2,
  UserRound,
  Clock,
} from 'lucide-react'
import { useState } from 'react'
import { useWebHaptics } from 'web-haptics/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { MagicCard } from '@/components/ui/magic-card'
import { PulseDot } from '@/components/landing/PulseDot'
import { GeminiLiveLogo } from '../icons/CustomIcons'
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

function GoogleGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black font-sans"
    >
      <DotPattern
        className="absolute inset-0 z-[1] text-amber-500/[0.04]"
        width={24}
        height={24}
        cr={0.8}
      />
      <div className="relative z-10 flex flex-col items-center">
        <Badge
          variant="outline"
          className="mb-6 h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] sm:text-xs font-medium tracking-widest text-amber-200 uppercase"
        >
          <PulseDot />
          PREPARING WORKSPACE
        </Badge>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 px-8 py-6 shadow-[0_0_60px_rgba(245,158,11,0.08)] backdrop-blur-xl">
          <h1 className="flex items-center gap-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Syncing <span className="text-amber-500">artifacts...</span>
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </h1>
        </div>
      </div>
    </motion.div>
  )
}

function formatSessionTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Just now'
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
  const displayName = user?.displayName?.trim() ?? user?.email?.split('@')[0] ?? 'Creative'

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed inset-0 z-[60] bg-black font-sans text-stone-100 overflow-y-auto"
    >
      <DotPattern
        className="absolute inset-0 z-[1] text-amber-500/[0.04]"
        width={24}
        height={24}
        cr={0.8}
      />

      <header className="fixed top-0 left-0 w-full z-50 border-b border-white/[0.04] bg-stone-950/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <GeminiLiveLogo className="h-6 w-6 text-amber-500" />
            <span>Void<span className="text-amber-400">pilot</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm font-medium text-stone-400">{displayName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                haptic.trigger('light')
                void onSignOut()
              }}
              disabled={isSubmitting}
              className="gap-2 rounded-full border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 pt-24 pb-12 w-full">
        <BlurFade delay={0.1}>
          <Badge
            variant="outline"
            className="mb-6 h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-5 py-2 text-[10px] sm:text-xs font-medium tracking-widest text-amber-200 uppercase"
          >
            <PulseDot />
            VOIDPILOT — SESSION LIBRARY
          </Badge>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 md:px-10 md:py-6 shadow-[0_0_60px_rgba(245,158,11,0.08)] backdrop-blur-xl">
            <h1 className="max-w-4xl text-center text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-white">
              Your <span className="text-amber-500">creative archives.</span>
            </h1>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} className="mt-6 text-center">
          <p className="max-w-2xl text-stone-400 sm:text-lg md:text-xl font-light leading-relaxed">
            Pick up right where you left off or start a fresh ideation session.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} className="mt-12 w-full max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* New Session Card */}
            <MagicCard
              gradientColor="#1c1917"
              gradientFrom="#f59e0b"
              gradientTo="#b45309"
              gradientOpacity={0.6}
              className="col-span-1 h-full rounded-[2rem]"
            >
              <button
                onClick={() => {
                  haptic.trigger('success')
                  void onCreateSession()
                }}
                disabled={activeAction !== null || isLoading}
                className="group relative flex h-full min-h-[220px] w-full flex-col justify-between rounded-[2rem] p-6 text-left transition-all hover:bg-white/[0.02] disabled:opacity-50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  {activeAction === 'create' ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                </div>
                <div className="mt-8">
                  <h3 className="mb-1 text-xl font-bold text-white">New Session</h3>
                  <p className="text-sm leading-relaxed text-stone-500">Start a fresh brainstorm</p>
                </div>
                <ArrowRight className="absolute right-6 bottom-6 h-6 w-6 text-amber-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </button>
            </MagicCard>

            {/* Existing Sessions */}
            {isLoading ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex min-h-[220px] flex-col items-center justify-center rounded-[2rem] border border-white/5 bg-white/[0.02]">
                <Loader2 className="size-8 animate-spin text-stone-500" />
                <p className="mt-4 text-sm text-stone-500">Loading library...</p>
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((session) => {
                const isOpening = activeAction === 'open' && activeSessionId === session.id
                const isDeleting = activeAction === 'delete' && activeSessionId === session.id

                return (
                  <MagicCard
                    key={session.id}
                    gradientColor="#1c1917"
                    gradientFrom="#d97706"
                    gradientTo="#92400e"
                    gradientOpacity={0.6}
                    className="col-span-1 h-full rounded-[2rem]"
                  >
                    <button
                      onClick={() => {
                        haptic.trigger('selection')
                        void onReopenSession(session.id)
                      }}
                      disabled={activeAction !== null}
                      className="group relative flex h-full min-h-[220px] w-full flex-col justify-between rounded-[2rem] p-6 text-left transition-all hover:bg-white/[0.02] disabled:opacity-50"
                    >
                      <div className="flex w-full items-start justify-between">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-stone-500/10 text-stone-400">
                          {isOpening ? <Loader2 className="h-6 w-6 animate-spin" /> : <FolderOpen className="h-6 w-6" />}
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            haptic.trigger('warning')
                            void onDeleteSession(session.id)
                          }}
                          className="z-10 rounded-xl p-2.5 text-stone-600 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="mt-8">
                        <h3 className="mb-2 text-lg font-bold text-white truncate pr-6">{session.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatSessionTimestamp(session.updatedAt)}</span>
                        </div>
                      </div>
                      <ArrowRight className="absolute right-6 bottom-6 h-6 w-6 text-stone-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    </button>
                  </MagicCard>
                )
              })
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex min-h-[220px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/[0.08] bg-white/[0.01]">
                <FolderOpen className="mb-3 size-6 text-stone-600" />
                <p className="text-sm font-medium text-stone-400">Your archive is empty.</p>
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

  const activeError = fieldError ?? errorMessage

  const validateForm = () => {
    const trimmedEmail = email.trim()
    const trimmedDisplayName = displayName.trim()
    if (!trimmedEmail) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return 'Invalid email address'
    if (!password) return 'Password is required'
    if (authMode === 'sign_up') {
      if (password.length < 6) return 'Password too short'
      if (confirmPassword !== password) return 'Passwords do not match'
      if (trimmedDisplayName.length > 40) return 'Name is too long'
    }
    return null
  }

  const handleSubmit = async () => {
    const error = validateForm()
    if (error) {
      setFieldError(error)
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
    } catch {}
  }

  const handleGoogleSignIn = async () => {
    setFieldError(null)
    haptic.trigger('selection')
    try {
      await onSignInWithGoogle()
    } catch {}
  }

  if (status === 'loading') return <LoadingState />
  if (status === 'signed_in') {
    return (
      <LibraryState
        user={user}
        isSubmitting={isSubmitting}
        sessions={librarySessions}
        isLoading={isLibraryLoading}
        activeAction={libraryActiveAction}
        activeSessionId={libraryActiveSessionId}
        onCreateSession={onCreateSession}
        onReopenSession={onReopenSession}
        onDeleteSession={onDeleteSession}
        onSignOut={onSignOut}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black font-sans overflow-y-auto">
      <DotPattern
        className="fixed inset-0 z-[1] text-amber-500/[0.04]"
        width={24}
        height={24}
        cr={0.8}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 w-full">
        <BlurFade delay={0.1}>
          <Badge
            variant="outline"
            className="mb-8 h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-5 py-2 text-[10px] sm:text-xs font-medium tracking-widest text-amber-200 uppercase"
          >
            <PulseDot />
            VOIDPILOT — BRAINSTORM ENTRY
          </Badge>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 md:px-12 md:py-8 shadow-[0_0_60px_rgba(245,158,11,0.08)] backdrop-blur-xl text-center">
            <h1 className="max-w-4xl text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-white">
              AI that <span className="text-amber-500">hears your voice.</span>
            </h1>
          </div>
        </BlurFade>

        <BlurFade delay={0.25}>
          <p className="mt-6 max-w-2xl text-center text-sm text-stone-400 sm:text-lg md:text-xl font-light leading-relaxed">
            Talk to Gemini, build a scene, and ideate faster — all in real time.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} className="mt-12 w-full max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Email Auth Bento Box */}
            <div className="col-span-1 md:col-span-2 flex flex-col justify-between rounded-[2rem] border border-white/10 bg-[#1c1917]/50 p-6 md:p-8 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Access Studio</h3>
                  <p className="text-sm text-stone-400">Sign in to sync your workspace</p>
                </div>
              </div>

              <div className="mb-6 flex rounded-xl border border-white/5 bg-black/40 p-1">
                {['sign_up', 'sign_in'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setAuthMode(mode as AuthMode)
                      setFieldError(null)
                      onClearError()
                    }}
                    className={cn(
                      "flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
                      authMode === mode ? "bg-stone-800 text-white shadow-md" : "text-stone-500 hover:text-stone-300"
                    )}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {authMode === 'sign_up' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Input
                        value={displayName}
                        onChange={(e) => { setDisplayName(e.target.value); setFieldError(null); onClearError(); }}
                        placeholder="Display Name"
                        className="h-14 rounded-xl border-white/10 bg-black/40 px-4 text-white placeholder:text-stone-600 focus:border-amber-500/50 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldError(null); onClearError(); }}
                  placeholder="Email address"
                  className="h-14 rounded-xl border-white/10 bg-black/40 px-4 text-white placeholder:text-stone-600 focus:border-amber-500/50 transition-all"
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldError(null); onClearError(); }}
                  placeholder="Password"
                  className="h-14 rounded-xl border-white/10 bg-black/40 px-4 text-white placeholder:text-stone-600 focus:border-amber-500/50 transition-all"
                />
                <AnimatePresence mode="wait">
                  {authMode === 'sign_up' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setFieldError(null); onClearError(); }}
                        placeholder="Confirm password"
                        className="h-14 mt-4 rounded-xl border-white/10 bg-black/40 px-4 text-white placeholder:text-stone-600 focus:border-amber-500/50 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeError && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400">
                  <CircleAlert className="size-4 shrink-0" />
                  {activeError}
                </motion.div>
              )}

              <Button
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="mt-6 h-14 w-full rounded-xl bg-amber-500 text-stone-950 font-bold text-lg transition-all hover:bg-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {authMode === 'sign_up' ? 'Create Account' : 'Sign In'}
              </Button>
            </div>

            <div className="col-span-1 flex flex-col gap-5">
              {/* Google Auth Box */}
              <MagicCard
                className="flex-1 rounded-[2rem]"
                gradientColor="#1c1917"
                gradientFrom="#d97706"
                gradientTo="#92400e"
                gradientOpacity={0.6}
              >
                <button
                  onClick={() => {
                    haptic.trigger('selection')
                    void handleGoogleSignIn()
                  }}
                  disabled={isSubmitting}
                  className="group relative flex h-full min-h-[160px] w-full flex-col justify-between rounded-[2rem] p-6 text-left transition-all hover:bg-white/[0.02]"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <GoogleGlyph className="h-6 w-6" />}
                  </div>
                  <div className="mt-4">
                    <h3 className="mb-1 text-lg font-bold text-white">Google Login</h3>
                    <p className="text-sm leading-relaxed text-stone-500">Continue with Google</p>
                  </div>
                  <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-orange-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </MagicCard>

              {/* Guest Box */}
              <MagicCard
                className="flex-1 rounded-[2rem]"
                gradientColor="#1c1917"
                gradientFrom="#e11d48"
                gradientTo="#9f1239"
                gradientOpacity={0.6}
              >
                <button
                  onClick={() => {
                    haptic.trigger('light')
                    onContinueAsGuest()
                  }}
                  disabled={isSubmitting}
                  className="group relative flex h-full min-h-[160px] w-full flex-col justify-between rounded-[2rem] p-6 text-left transition-all hover:bg-white/[0.02]"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="mt-4">
                    <h3 className="mb-1 text-lg font-bold text-white">Ephemeral Mode</h3>
                    <p className="text-sm leading-relaxed text-stone-500">Continue as guest</p>
                  </div>
                  <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-rose-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </MagicCard>
            </div>
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
