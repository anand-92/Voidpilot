import { useCallback, useEffect, useState } from 'react'
import { firebaseAuth } from '@/lib/firebase'
import type {
  BrainstormEntryAuthStatus,
  BrainstormEntryAuthUser,
} from '@/hooks/useBrainstormEntryAuth'

const BRAINSTORM_SESSION_LIBRARY_ENDPOINT = '/api/v1/live/brainstorm/sessions'

export type BrainstormLibrarySession = {
  id: string
  ownerUid: string
  ownerEmail: string | null
  ownerName: string | null
  mode: string
  brainstormType?: string
  title: string
  createdAt: string
  updatedAt: string
}

type BrainstormSessionResponse = {
  session: BrainstormLibrarySession
}

type BrainstormSessionListResponse = {
  sessions: BrainstormLibrarySession[]
}

export type BrainstormLibraryAction = 'create' | 'open' | 'delete' | null

class BrainstormSessionLibraryRequestError extends Error {
  status: number
  code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = 'BrainstormSessionLibraryRequestError'
    this.status = status
    this.code = code
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof BrainstormSessionLibraryRequestError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = firebaseAuth.currentUser
  if (!currentUser) {
    throw new Error('Your brainstorm sign-in expired. Sign in again to access saved sessions.')
  }

  const token = await currentUser.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

async function readErrorResponse(response: Response, fallback: string): Promise<never> {
  let message = fallback
  let code: string | null = null

  try {
    const payload = await response.json() as {
      detail?: { message?: string; code?: string } | string
    }
    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      message = payload.detail
    } else if (payload.detail && typeof payload.detail === 'object') {
      message = payload.detail.message?.trim() ?? fallback
      code = payload.detail.code?.trim() ?? null
    }
  } catch {
    // Fall back to the default message when the response has no JSON body.
  }

  throw new BrainstormSessionLibraryRequestError(message, response.status, code)
}

async function requestLibrary<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const headers = new Headers(init?.headers)
  const authHeaders = await getAuthHeaders()

  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })

  const response = await fetch(path, {
    ...init,
    headers,
  })

  if (!response.ok) {
    await readErrorResponse(response, 'Brainstorm session request failed.')
  }

  if (response.status === 204) {
    return null
  }

  return response.json() as Promise<T>
}

export function useBrainstormSessionLibrary({
  status,
  user,
}: {
  status: BrainstormEntryAuthStatus
  user: BrainstormEntryAuthUser | null
}) {
  const [sessions, setSessions] = useState<BrainstormLibrarySession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<BrainstormLibraryAction>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const loadSessions = useCallback(async () => {
    if (status !== 'signed_in' || !user) {
      setSessions([])
      setIsLoading(false)
      setErrorMessage(null)
      return []
    }

    setIsLoading(true)

    try {
      const response = await requestLibrary<BrainstormSessionListResponse>(
        BRAINSTORM_SESSION_LIBRARY_ENDPOINT,
      )
      const nextSessions = response?.sessions ?? []
      setSessions(nextSessions)
      setErrorMessage(null)
      return nextSessions
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'We could not load your brainstorm sessions.'),
      )
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [status, user])

  useEffect(() => {
    if (status !== 'signed_in' || !user) {
      setSessions([])
      setIsLoading(false)
      setErrorMessage(null)
      setActiveAction(null)
      setActiveSessionId(null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    void requestLibrary<BrainstormSessionListResponse>(
      BRAINSTORM_SESSION_LIBRARY_ENDPOINT,
    )
      .then((response) => {
        if (cancelled) {
          return
        }
        setSessions(response?.sessions ?? [])
        setErrorMessage(null)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        setErrorMessage(
          getErrorMessage(error, 'We could not load your brainstorm sessions.'),
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [status, user])

  const createSession = useCallback(async (brainstormType?: string) => {
    setActiveAction('create')
    setActiveSessionId(null)
    setErrorMessage(null)

    try {
      const body: Record<string, string> = {}
      if (brainstormType) {
        body.brainstorm_type = brainstormType
      }

      const response = await requestLibrary<BrainstormSessionResponse>(
        BRAINSTORM_SESSION_LIBRARY_ENDPOINT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const session = response?.session
      if (!session) {
        throw new Error('Brainstorm session creation returned no session record.')
      }

      setSessions((previous) => [
        session,
        ...previous.filter((existing) => existing.id !== session.id),
      ])
      return session
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'We could not create a new brainstorm session.'),
      )
      return null
    } finally {
      setActiveAction(null)
    }
  }, [])

  const reopenSession = useCallback(async (sessionId: string) => {
    setActiveAction('open')
    setActiveSessionId(sessionId)
    setErrorMessage(null)

    try {
      const response = await requestLibrary<BrainstormSessionResponse>(
        `${BRAINSTORM_SESSION_LIBRARY_ENDPOINT}/${sessionId}`,
      )
      const session = response?.session
      if (!session) {
        throw new Error('Brainstorm session reopen returned no session record.')
      }
      return session
    } catch (error) {
      if (
        error instanceof BrainstormSessionLibraryRequestError
        && error.status === 404
      ) {
        setSessions((previous) => previous.filter((session) => session.id !== sessionId))
      }

      setErrorMessage(
        getErrorMessage(error, 'We could not reopen that brainstorm session.'),
      )
      return null
    } finally {
      setActiveAction(null)
      setActiveSessionId(null)
    }
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    setActiveAction('delete')
    setActiveSessionId(sessionId)
    setErrorMessage(null)

    try {
      await requestLibrary<void>(
        `${BRAINSTORM_SESSION_LIBRARY_ENDPOINT}/${sessionId}`,
        { method: 'DELETE' },
      )
      setSessions((previous) => previous.filter((session) => session.id !== sessionId))
    } catch (error) {
      if (
        error instanceof BrainstormSessionLibraryRequestError
        && error.status === 404
      ) {
        setSessions((previous) => previous.filter((session) => session.id !== sessionId))
      }

      setErrorMessage(
        getErrorMessage(error, 'We could not delete that brainstorm session.'),
      )
    } finally {
      setActiveAction(null)
      setActiveSessionId(null)
    }
  }, [])

  return {
    sessions,
    isLoading,
    errorMessage,
    activeAction,
    activeSessionId,
    clearError,
    loadSessions,
    createSession,
    reopenSession,
    deleteSession,
  }
}
