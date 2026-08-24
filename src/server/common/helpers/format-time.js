/**
 * The zone a time of day is read in here. A caller that shows a date beside
 * the time passes this to formatDate, so both halves name the same day.
 */
export const UK_TIME_ZONE = 'Europe/London'

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
    timeZone: UK_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return formatted.replace(/\s/g, '')
}
