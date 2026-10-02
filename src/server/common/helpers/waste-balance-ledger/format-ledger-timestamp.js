import { formatDate } from '#server/common/helpers/format-date.js'
import { UK_TIME_ZONE, formatTime } from '#server/common/helpers/format-time.js'

/**
 * The moment a ledger event happened, as the Date cell reads it.
 * e.g. "2026-08-18T16:06:00.000Z" → "18 August 2026, 5:06pm"
 *
 * The rows carry no sequence number, so the time of day is what lets a reader
 * follow the order of two events of one day, and a ledger writes several in a
 * day.
 *
 * Both halves read the same clock. A UK evening in summer is already the next
 * day in UTC, so a UTC date beside a UK time would name a day the event did
 * not happen on.
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
export function formatLedgerTimestamp(isoString) {
  if (!isoString) {
    return ''
  }

  const date = formatDate(isoString, { timeZone: UK_TIME_ZONE })

  if (!date) {
    return ''
  }

  return `${date}, ${formatTime(isoString)}`
}
