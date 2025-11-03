import { languages, pathPrefix } from '#server/common/constants/languages.js'
import assert from 'node:assert'

/**
 * Creates a URL localization function for a specific language.
 * @param {string} language - The language code (e.g., 'en' for English, 'cy' for Welsh)
 * @returns {function(string): string} A function that takes a path and returns the localized URL
 */
export const localiseUrl = (language) => {
  assert(language, 'language is undefined')

  const prefix = pathPrefix[language] || pathPrefix[languages.ENGLISH]

  return (path) => {
    if (path) {
      const url = new URL(path, 'https://example')
      return `${prefix}${url.pathname}${url.search}${url.hash}`
    }
    return prefix || '/'
  }
}
