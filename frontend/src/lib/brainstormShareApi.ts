/**
 * REST API helpers for brainstorm public share functionality.
 *
 * Share creation requires auth (owner-only).
 * Public share resolution and artifact download do NOT require auth.
 */

import { firebaseAuth } from '@/lib/firebase'
import { getDownloadFilename } from '@/lib/contentDisposition'

const BRAINSTORM_BASE = '/api/v1/live/brainstorm'

export type ShareInfo = {
  shareToken: string
  sessionId: string
  createdAt: string
}

export type PublicShareSession = {
  id: string
  ownerName: string | null
  mode: string
  title: string
  createdAt: string
  updatedAt: string
}

export type PublicShareTurn = {
  role: string
  content: string
  isToolResponse?: boolean
}

export type PublicShareArtifact = {
  artifactId: string
  filename: string
  mimeType: string
  sizeBytes?: number | null
  label: string | null
  text: string | null
  createdAt: string
}

export type PublicShareData = {
  session: PublicShareSession
  turns: PublicShareTurn[]
  artifacts: PublicShareArtifact[]
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = firebaseAuth.currentUser
  if (!currentUser) {
    throw new Error('Sign-in session expired.')
  }

  const token = await currentUser.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

/**
 * Create or retrieve a public share link for a persisted session.
 * Requires authentication (owner-only).
 */
export async function createBrainstormShare(
  sessionId: string,
): Promise<ShareInfo> {
  const authHeaders = await getAuthHeaders()

  const response = await fetch(
    `${BRAINSTORM_BASE}/sessions/${sessionId}/share`,
    {
      method: 'POST',
      headers: authHeaders,
    },
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Failed to create share link (${response.status}): ${text}`,
    )
  }

  const data = await response.json()
  return data.share as ShareInfo
}

/**
 * Resolve a public share token to session data.
 * Does NOT require authentication.
 */
export async function fetchPublicShare(
  shareToken: string,
): Promise<PublicShareData> {
  const response = await fetch(
    `${BRAINSTORM_BASE}/share/${shareToken}`,
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Share not found or expired (${response.status}): ${text}`,
    )
  }

  return response.json() as Promise<PublicShareData>
}

/**
 * Download a single artifact via a public share link.
 * Does NOT require authentication.
 */
export async function downloadPublicArtifact(
  shareToken: string,
  artifactId: string,
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const url = `${BRAINSTORM_BASE}/share/${shareToken}/artifacts/${artifactId}/download`

  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Artifact download failed (${response.status}): ${text}`,
    )
  }

  const blob = await response.blob()
  const filename = getDownloadFilename(
    response.headers.get('content-disposition'),
  )
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'

  return { blob, mimeType, filename }
}
