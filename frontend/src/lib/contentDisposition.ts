export function getDownloadFilename(
  contentDisposition: string | null,
  fallback = 'artifact',
): string {
  if (!contentDisposition) {
    return fallback
  }

  const encodedFilenameMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  )
  if (encodedFilenameMatch?.[1]) {
    try {
      return decodeURIComponent(encodedFilenameMatch[1])
    } catch {
      return encodedFilenameMatch[1]
    }
  }

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] ?? fallback
}
