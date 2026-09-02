import { formatDateShort } from '#server/common/helpers/format-date.js'
import { UK_TIME_ZONE, formatTime } from '#server/common/helpers/format-time.js'

/**
 * The moment a report was submitted, as a table cell reads it.
 * e.g. "2026-02-15T15:09:00.000Z" → "15 Feb 2026, 3:09pm"
 *
 * Both halves read the same clock. A UK evening in summer is already the next
 * day in UTC, so a UTC date beside a UK time would name a day the report was
 * not submitted on.
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
export const formatSubmittedDateTime = (isoString) => {
  if (!isoString) {
    return ''
  }
  return `${formatDateShort(isoString, { timeZone: UK_TIME_ZONE })}, ${formatTime(isoString)}`
}
