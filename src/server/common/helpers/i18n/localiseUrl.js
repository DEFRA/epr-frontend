import { config } from '#config/config.js'
import { languages, pathPrefix } from '#modules/platform/constants/languages.js'

/**
 * Creates a URL localization function for a specific language.
 * @param {string} language - The language code (e.g., 'en' for English, 'cy' for Welsh)
 * @returns {function(string): string} A function that takes a path and returns the localized URL
 */
export const localiseUrl = (language) => {
  const base = config.get('appBaseUrl')
  const prefix = pathPrefix[language] || pathPrefix[languages.ENGLISH]

  return (path) => {
    if (path) {
      const url = new URL(path, base)
      return `${prefix}${url.pathname}${url.search}${url.hash}`
    }
    return prefix || '/'
  }
}
