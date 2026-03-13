type ArtifactBlobLike = {
  content: string | null
  mimeType: string
}

export async function blobToArtifactContent(
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const isBinary = mimeType.startsWith('image/') || mimeType.startsWith('video/')

  if (!isBinary) {
    return blob.text()
  }

  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }

  return btoa(binary)
}

export function artifactToBlob(artifact: ArtifactBlobLike): Blob {
  if (artifact.content === null) {
    throw new Error('Artifact content has not been loaded yet.')
  }

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
