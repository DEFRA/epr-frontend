import assert from 'node:assert'
import { langPrefix } from '../../constants/lang-prefix.js'

const VALID_PREFIXES = Object.values(langPrefix)

/**
 * Creates a URL localization function with a specific language prefix.
 * @param {string} prefix - The language prefix to prepend (e.g., "" for English, "/cy" for Welsh)
 * @returns {function(string): string} A function that takes a path and returns the localized URL
 */
export const localiseUrl = (prefix) => {
  // FIXME should we assert or pass the language here instead?
  assert(
    VALID_PREFIXES.includes(prefix),
    `Invalid language prefix: "${prefix}". Must be one of: ${VALID_PREFIXES.map((p) => `"${p}"`).join(', ')}`
  )

  return (path) => {
    if (path) {
      const url = new URL(path, 'https://example')
      return `${prefix}${url.pathname}${url.search}${url.hash}`
    }
    return prefix || '/'
  }
}
