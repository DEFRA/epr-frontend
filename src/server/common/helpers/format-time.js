/**
 * Format an ISO timestamp to a 12-hour time string in UK local time.
 * e.g. "2026-02-15T15:09:00.000Z" → "3:09pm"
 * @param {string} isoString
 * @returns {string}
 */
export function formatTime(isoString) {
  if (!isoString || Number.isNaN(new Date(isoString).getTime())) {
    return ''
  }

  const formatted = new Date(isoString).toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return formatted.replace(/\s/g, '')
}
