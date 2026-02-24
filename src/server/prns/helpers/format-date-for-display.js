/**
 * Format date for display in UK format (e.g. "16 January 2026")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDateForDisplay(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
