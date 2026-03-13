/**
 * REST API helpers for brainstorm turn persistence.
 *
 * Uses the same auth-header pattern as useBrainstormSessionLibrary.
 */

import { firebaseAuth } from '@/lib/firebase'

const BRAINSTORM_SESSIONS_BASE = '/api/v1/live/brainstorm/sessions'

export type PersistedTurn = {
  role: string
  content: string
  isToolResponse?: boolean
}

type SaveTurnsResponse = {
  sessionId: string
  turnCount: number
}

type LoadTurnsResponse = {
  sessionId: string
  turns: PersistedTurn[]
}

type UpdateTitleResponse = {
  session: {
    id: string
    title: string
    updatedAt: string
    [key: string]: unknown
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = firebaseAuth.currentUser
  if (!currentUser) {
    throw new Error('Sign-in session expired.')
  }

  const token = await currentUser.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function authedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const headers = new Headers(init?.headers)
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })

  const response = await fetch(path, { ...init, headers })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Brainstorm persistence request failed (${response.status}): ${text}`,
    )
  }

  return response.json() as Promise<T>
}

/**
 * Save the full transcript turn list for a signed-in session.
 * Each call replaces the previous turn state entirely.
 */
export async function saveBrainstormTurns(
  sessionId: string,
  turns: PersistedTurn[],
): Promise<SaveTurnsResponse> {
  return authedFetch<SaveTurnsResponse>(
    `${BRAINSTORM_SESSIONS_BASE}/${sessionId}/turns`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turns }),
    },
  )
}

/**
 * Load previously saved turns for a signed-in session.
 */
export async function loadBrainstormTurns(
  sessionId: string,
): Promise<PersistedTurn[]> {
  const response = await authedFetch<LoadTurnsResponse>(
    `${BRAINSTORM_SESSIONS_BASE}/${sessionId}/turns`,
  )
  return response.turns
}

/**
 * Update the AI-generated title for a signed-in session.
 */
export async function updateBrainstormSessionTitle(
  sessionId: string,
  title: string,
): Promise<UpdateTitleResponse> {
  return authedFetch<UpdateTitleResponse>(
    `${BRAINSTORM_SESSIONS_BASE}/${sessionId}/title`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    },
  )
}
