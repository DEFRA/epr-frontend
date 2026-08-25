import { ukWallClockToInstant } from '#server/common/helpers/reapply-accreditation/uk-wall-clock-to-instant.js'

/**
 * Whether `now` falls within the recurring annual reapply window.
 *
 * The window is expressed as inclusive calendar-month bounds so it recurs every
 * year: the whole of the start month through the whole of the end month, except
 * that day 1 of the start month only opens at `windowStartTime` (UK local time)
 * rather than from midnight - the downstream WS2 service the link points at
 * goes live at a specific time, not at the stroke of midnight, so showing the
 * link earlier would be a broken link. Assumes a non-wrapping window
 * (`windowStartMonth <= windowEndMonth`), enforced at config load by
 * `assertValidReapplyWindow`.
 * @param {Date} now
 * @param {{
 *   windowStartMonth: number;
 *   windowEndMonth: number;
 *   windowStartTime: string;
 * }} window
 * @returns {boolean}
 */
export const isWithinReapplyWindow = (
  now,
  { windowStartMonth, windowEndMonth, windowStartTime }
) => {
  const month = now.getMonth() + 1

  if (month < windowStartMonth || month > windowEndMonth) {
    return false
  }

  if (month > windowStartMonth) {
    return true
  }

  const windowOpensAt = ukWallClockToInstant({
    year: now.getFullYear(),
    month: windowStartMonth,
    day: 1,
    time: windowStartTime
  })

  return now >= windowOpensAt
}
