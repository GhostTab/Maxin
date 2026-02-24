/**
 * Download a file from a URL and save it with a suggested filename (e.g. PDF, image).
 * Fetches the file as a blob and triggers a browser download so the user gets the actual file.
 */

/**
 * Get file extension from URL path (e.g. ".pdf", ".jpg"). Falls back to ".pdf" if unknown.
 * @param {string} url
 * @returns {string}
 */
function getExtensionFromUrl(url) {
  try {
    const path = new URL(url).pathname
    const last = path.split('/').pop() || ''
    const dot = last.lastIndexOf('.')
    if (dot > 0) {
      const ext = last.slice(dot).toLowerCase()
      if (/^\.(pdf|jpg|jpeg|png|gif|doc|docx|webp)$/.test(ext)) return ext
    }
  } catch (_) {}
  return '.pdf'
}

/**
 * Download the file at `url` and save as `suggestedFilename` (e.g. "Juan-Delacruz-KYC.pdf").
 * If suggestedFilename has no extension, one is inferred from the URL.
 *
 * @param {string} url - Full URL of the file (e.g. Supabase Storage public URL)
 * @param {string} suggestedFilename - Name to use when saving (e.g. "ClientName-KYC.pdf")
 * @returns {Promise<void>}
 */
export async function downloadFile(url, suggestedFilename) {
  if (!url || typeof url !== 'string') throw new Error('No file URL')
  const name = suggestedFilename && suggestedFilename.trim()
    ? suggestedFilename.trim()
    : `download${getExtensionFromUrl(url)}`
  const filename = name.includes('.') ? name : `${name}${getExtensionFromUrl(url)}`

  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(blobUrl)
}
