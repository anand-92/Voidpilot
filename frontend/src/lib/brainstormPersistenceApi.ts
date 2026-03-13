/**
 * REST API helpers for brainstorm turn persistence.
 *
 * Uses the same auth-header pattern as useBrainstormSessionLibrary.
 */

import { firebaseAuth } from '@/lib/firebase'
import { getDownloadFilename } from '@/lib/contentDisposition'

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

// ── Artifact persistence ─────────────────────────────────────────

export type PersistedArtifactMetadata = {
  artifactId: string
  filename: string
  mimeType: string
  blobPath: string
  sizeBytes?: number | null
  label: string | null
  text: string | null
  createdAt: string
}

type SaveArtifactResponse = {
  artifact: PersistedArtifactMetadata
}

type LoadArtifactsResponse = {
  sessionId: string
  artifacts: PersistedArtifactMetadata[]
}

/**
 * Persist a single artifact (metadata + blob) to a signed-in session.
 *
 * The session_id targets the *originating* session so that delayed
 * completions always land on the correct session even if the user
 * has since switched to a different session in the frontend.
 */
export async function saveBrainstormArtifact(
  sessionId: string,
  artifact: {
    filename: string
    content: string
    mimeType: string
    label?: string
    text?: string
  },
): Promise<SaveArtifactResponse> {
  return authedFetch<SaveArtifactResponse>(
    `${BRAINSTORM_SESSIONS_BASE}/${sessionId}/artifacts`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: artifact.filename,
        content: artifact.content,
        mimeType: artifact.mimeType,
        label: artifact.label,
        text: artifact.text,
      }),
    },
  )
}

/**
 * Load all artifact metadata for a signed-in session.
 * Actual content must be fetched via downloadBrainstormArtifact.
 */
export async function loadBrainstormArtifacts(
  sessionId: string,
): Promise<PersistedArtifactMetadata[]> {
  const response = await authedFetch<LoadArtifactsResponse>(
    `${BRAINSTORM_SESSIONS_BASE}/${sessionId}/artifacts`,
  )
  return response.artifacts
}

/**
 * Download a single artifact's content bytes.
 * Returns {blob, mimeType, filename} for preview or download use.
 */
export async function downloadBrainstormArtifact(
  sessionId: string,
  artifactId: string,
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const authHeaders = await getAuthHeaders()
  const url = `${BRAINSTORM_SESSIONS_BASE}/${sessionId}/artifacts/${artifactId}/download`

  const response = await fetch(url, {
    headers: authHeaders,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Brainstorm artifact download failed (${response.status}): ${text}`,
    )
  }

  const blob = await response.blob()
  const filename = getDownloadFilename(
    response.headers.get('content-disposition'),
  )
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'

  return { blob, mimeType, filename }
}
