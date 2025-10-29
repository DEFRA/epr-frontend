import { languages } from '#server/common/constants/language-codes.js'

/**
 * Prefixes a path with the correct language code.
 * @param {string} path - The path to localise (e.g. "/organisations/123")
 * @param {string} langPrefix - Usually "" or "/cy"
 * @returns {string}
 */
export function localiseUrl(path, langPrefix = languages.ENGLISH) {
  if (!path) {
    return '/'
  }

  const normalisedPath = path.startsWith('/') ? path : `/${path}`

  if (langPrefix === languages.ENGLISH) {
    return normalisedPath
  }

  const prefix = `/${langPrefix}`
  if (normalisedPath.startsWith(prefix + '/')) {
    return normalisedPath
  }

  return `${prefix}${normalisedPath}`
}
