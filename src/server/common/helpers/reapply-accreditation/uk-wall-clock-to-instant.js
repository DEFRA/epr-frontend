import { UK_TIME_ZONE } from '#server/common/helpers/format-time.js'

/**
 * The UK's offset from UTC at a given instant, in milliseconds. Read via the
 * `Europe/London` zone so BST/GMT is resolved by the platform's IANA tz data
 * rather than hand-rolled DST rules.
 * @param {number} instantMs
 * @returns {number}
 */
function ukOffsetMs(instantMs) {
  /** @type {Record<string, string>} */
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
    .formatToParts(new Date(instantMs))
    .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {})

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )

  return asUtc - instantMs
}

/**
 * Resolve a UK wall-clock date and time (as read on a clock in the UK, BST or
 * GMT) to the UTC instant it names. Needed because the reapply window spans
 * the DST change - 1 September is BST, 31 December is GMT - so a fixed UTC
 * offset cannot represent "9am UK time" correctly at both ends of the window.
 * @param {{ year: number; month: number; day: number; time: string }} params
 *   `month` is 1-12. `time` is 24-hour `HH:mm`.
 * @returns {Date}
 */
export function ukWallClockToInstant({ year, month, day, time }) {
  const [hour, minute] = time.split(':').map(Number)
  const naiveGuessMs = Date.UTC(year, month - 1, day, hour, minute)

  // One correction pass is enough: the UK offset only takes two values (0 or
  // 60 minutes), and the naive guess is already within an hour of the true
  // instant, so a second pass cannot land on a different offset.
  return new Date(naiveGuessMs - ukOffsetMs(naiveGuessMs))
}
