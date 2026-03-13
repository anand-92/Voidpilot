import { FirebaseError } from 'firebase/app'
import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import {
  ensureFirebaseAuthPersistence,
  firebaseAuth,
  googleAuthProvider,
} from '@/lib/firebase'

export type BrainstormEntryAuthStatus = 'loading' | 'signed_out' | 'signed_in'

export type BrainstormEntryAuthUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

function normalizeAuthUser(user: User | null): BrainstormEntryAuthUser | null {
  if (!user) {
    return null
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  }
}

function mapAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'Something went wrong while contacting Brainstorm auth. Please try again.'
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account. Try signing in instead.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'That email and password combination did not work. Please try again.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before it finished.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups and try again.'
    case 'auth/network-request-failed':
      return 'Network request failed. Check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts were blocked for a moment. Wait a bit and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in yet.'
    case 'auth/operation-not-allowed':
      return 'That sign-in method is not enabled yet. Try another entry path.'
    case 'auth/weak-password':
      return 'Use a stronger password with at least 6 characters.'
    default:
      return error.message || 'Authentication failed. Please try again.'
  }
}

export function useBrainstormEntryAuth() {
  const [status, setStatus] = useState<BrainstormEntryAuthStatus>('loading')
  const [user, setUser] = useState<BrainstormEntryAuthUser | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authChangeKey, setAuthChangeKey] = useState(0)

  useEffect(() => {
    void ensureFirebaseAuthPersistence().catch((error: unknown) => {
      console.error('Failed to configure Firebase auth persistence', error)
    })
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(normalizeAuthUser(nextUser))
      setStatus(nextUser ? 'signed_in' : 'signed_out')
      setErrorMessage(null)
      setAuthChangeKey((previous) => previous + 1)
    })

    return unsubscribe
  }, [])

  const clearError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
    } catch (error) {
      setErrorMessage(mapAuthError(error))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const signUpWithPassword = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setIsSubmitting(true)
      setErrorMessage(null)

      try {
        const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)

        if (displayName?.trim()) {
          const trimmedDisplayName = displayName.trim()

          await updateProfile(result.user, { displayName: trimmedDisplayName })
          setUser({
            uid: result.user.uid,
            email: result.user.email,
            displayName: trimmedDisplayName,
            photoURL: result.user.photoURL,
          })
        }
      } catch (error) {
        setErrorMessage(mapAuthError(error))
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [],
  )

  const signInWithGoogle = useCallback(async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await signInWithPopup(firebaseAuth, googleAuthProvider)
    } catch (error) {
      setErrorMessage(mapAuthError(error))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const signOutFromBrainstorm = useCallback(async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await signOut(firebaseAuth)
    } catch (error) {
      setErrorMessage(mapAuthError(error))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    status,
    user,
    errorMessage,
    isSubmitting,
    authChangeKey,
    clearError,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOutFromBrainstorm,
  }
}
