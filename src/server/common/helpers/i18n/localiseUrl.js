/**
 * Prefixes a path with the correct language code.
 * @param {string} path - The path to localise (e.g. "/organisations/123")
 * @param {string} langPrefix - Usually "" or "/cy"
 * @returns {string}
 */

import { config } from '#config/config.js'

export function localiseUrl(path, langPrefix = '') {
  const baseUrl = config.get('appBaseUrl')
  const cleanedPath = path.startsWith('/') ? path : `/${path}`

  const url = new URL(cleanedPath, baseUrl)

  let newPath = `${langPrefix}${url.pathname}`

  while (newPath.endsWith('/') && newPath.length > 1) {
    newPath = newPath.slice(0, -1)
  }

  return `${newPath}${url.search}${url.hash}`
}
