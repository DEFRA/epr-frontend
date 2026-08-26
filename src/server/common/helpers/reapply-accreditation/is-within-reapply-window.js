import { formatUkDateTime } from '#server/common/helpers/format-time.js'

/**
 * Whether `now` falls within the recurring annual reapply window. Compared as
 * a UK wall-clock stamp (`MM-DDTHH:mm`, year omitted) against `windowStart`/
 * `windowEnd`, which are configured in the same shape - see `config.js`.
 * @param {Date} now
 * @param {{ windowStart: string; windowEnd: string }} window
 * @returns {boolean}
 */
export const isWithinReapplyWindow = (now, { windowStart, windowEnd }) => {
  const stamp = formatUkDateTime(now)

  return stamp >= windowStart && stamp <= windowEnd
}
