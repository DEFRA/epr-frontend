/**
 * Escape HTML special characters to prevent XSS when
 * inserting dynamic values into HTML strings.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) {
    return ''
  }

  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
