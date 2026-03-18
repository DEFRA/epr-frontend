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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
