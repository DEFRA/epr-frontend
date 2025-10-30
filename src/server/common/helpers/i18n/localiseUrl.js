/**
 * Prefixes a path with the correct language code.
 * @param {string} path - The path to localise (e.g. "/organisations/123")
 * @param {string} langPrefix - Usually "" or "/cy"
 * @returns {string}
 */

export function localiseUrl(path, langPrefix = '') {
  if (!path) {
    return langPrefix || ''
  }
  const cleaned = path.startsWith('/') ? path : `/${path}`
  return `${langPrefix}${cleaned}`.replace(/\/+$/, '')
}
