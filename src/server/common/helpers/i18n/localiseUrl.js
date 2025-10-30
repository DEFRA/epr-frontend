/**
 * Creates a URL localization function with a specific language prefix.
 * @param {string} prefix - The language prefix to prepend (e.g., "" for English, "/cy" for Welsh)
 * @returns {function(string): string} A function that takes a path and returns the localized URL
 */

export const localiseUrl = (prefix) => (path) => {
  if (path) {
    const url = new URL(path, 'https://example')
    return `${prefix}${url.pathname}${url.search}${url.hash}`
  }
  return prefix || '/'
}
