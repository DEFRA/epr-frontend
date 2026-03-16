/**
 * Format an ISO timestamp to a 12-hour time string.
 * e.g. "2026-02-15T15:09:00.000Z" → "3:09pm"
 * @param {string} isoString
 * @returns {string}
 */
export function formatTime(isoString) {
  const date = new Date(isoString)

  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const suffix = hours >= 12 ? 'pm' : 'am'
  const displayHour = hours % 12 || 12

  return `${displayHour}:${minutes.toString().padStart(2, '0')}${suffix}`
}
