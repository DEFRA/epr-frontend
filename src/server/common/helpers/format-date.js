/**
 * Format an ISO timestamp to a human-readable date.
 * e.g. "2026-02-15T15:09:00.000Z" → "15 February 2026" (default)
 * e.g. "2026-02-15T15:09:00.000Z" → "15 February" (includeYear: false)
 * @param {string} isoString
 * @param {{ includeYear?: boolean }} [options]
 * @returns {string}
 */
export function formatDate(isoString, { includeYear = true } = {}) {
  if (!isoString || Number.isNaN(new Date(isoString).getTime())) {
    return ''
  }

  /** @type {Intl.DateTimeFormatOptions} */
  const dateOptions = { day: 'numeric', month: 'long', timeZone: 'UTC' }

  if (includeYear) {
    dateOptions.year = 'numeric'
  }

  return new Date(isoString).toLocaleDateString('en-GB', dateOptions)
}
