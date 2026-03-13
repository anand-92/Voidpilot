import JSZip from 'jszip'
import {
  artifactToBlob,
  downloadBlob,
} from '@/lib/brainstormArtifactFiles'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getArtifactSize(artifact: BrainstormArtifact): number {
  if (artifact.content === null) {
    return artifact.sizeBytes ?? 0
  }

  if (artifact.mimeType.startsWith('image/') || artifact.mimeType.startsWith('video/')) {
    return artifact.sizeBytes ?? Math.floor((artifact.content.length * 3) / 4)
  }
  return artifact.sizeBytes ?? new Blob([artifact.content]).size
}

export function downloadSingleArtifact(artifact: BrainstormArtifact) {
  downloadBlob(artifactToBlob(artifact), artifact.filename)
}

export async function downloadAllArtifacts(artifacts: Map<string, BrainstormArtifact>) {
  const zip = new JSZip()

  for (const [filename, artifact] of artifacts) {
    if (artifact.content === null) {
      continue
    }

    zip.file(filename, artifactToBlob(artifact))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'brainstorm-artifacts.zip')
}
