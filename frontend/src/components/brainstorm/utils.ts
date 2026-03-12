import JSZip from 'jszip'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getArtifactSize(artifact: BrainstormArtifact): number {
  if (artifact.mimeType.startsWith('image/') || artifact.mimeType.startsWith('video/')) {
    return Math.floor((artifact.content.length * 3) / 4)
  }
  return new Blob([artifact.content]).size
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function artifactToBlob(artifact: BrainstormArtifact): Blob {
  if (artifact.mimeType.startsWith('image/') || artifact.mimeType.startsWith('video/')) {
    const binary = atob(artifact.content)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], { type: artifact.mimeType })
  }

  return new Blob([artifact.content], { type: artifact.mimeType })
}

export function downloadSingleArtifact(artifact: BrainstormArtifact) {
  downloadBlob(artifactToBlob(artifact), artifact.filename)
}

export async function downloadAllArtifacts(artifacts: Map<string, BrainstormArtifact>) {
  const zip = new JSZip()

  for (const [filename, artifact] of artifacts) {
    if (artifact.mimeType.startsWith('image/') || artifact.mimeType.startsWith('video/')) {
      const binary = atob(artifact.content)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      zip.file(filename, bytes)
    } else {
      zip.file(filename, artifact.content)
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'brainstorm-artifacts.zip')
}
