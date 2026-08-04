import { endOfDay, isWithinInterval, parse, startOfDay } from 'date-fns'

/**
 * Whether `now` falls within the recurring annual reapply window.
 *
 * The window is expressed as `MM-DD` bounds so it recurs every year; the
 * comparison anchors both bounds to `now`'s calendar year. Both ends are
 * inclusive (the whole of the start day through the whole of the end day).
 * @param {Date} now
 * @param {{ windowStart: string; windowEnd: string }} window - `MM-DD` bounds
 * @returns {boolean}
 */
export const isWithinReapplyWindow = (
  now = new Date(),
  { windowStart, windowEnd }
) => {
  const year = now.getFullYear()
  const start = startOfDay(parse(`${year}-${windowStart}`, 'yyyy-MM-dd', now))
  const end = endOfDay(parse(`${year}-${windowEnd}`, 'yyyy-MM-dd', now))

  return isWithinInterval(now, { start, end })
}
