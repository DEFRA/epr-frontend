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

const ukDateTimeParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIME_ZONE,
  hour12: false,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

/**
 * Format a moment as a UK local `MM-DDTHH:mm` stamp - zero-padded and
 * machine-comparable, not for display (use formatDate/formatTime for that).
 * `date` must be unambiguous (Date, epoch ms, or an ISO string with a
 * zone/offset) - a zoneless ISO string is parsed in the runtime's zone first.
 * e.g. "2026-09-01T08:30:00Z" (BST) → "09-01T09:30"
 * @param {Date | string | number | null | undefined} date
 * @returns {string} empty string when `date` is not a valid date
 */
export function formatUkDateTime(date) {
  if (date === null || date === undefined) {
    return ''
  }

  const asDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(asDate.getTime())) {
    return ''
  }

  /** @type {Record<string, string>} */
  const parts = ukDateTimeParts
    .formatToParts(asDate)
    .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {})

  return `${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
