/**
 * Whether `now` falls within the recurring annual reapply window.
 *
 * The window is expressed as inclusive calendar-month bounds so it recurs every
 * year: the whole of the start month through the whole of the end month. The
 * AC only ever uses month boundaries (Jan-Aug is months 1-8, Sept-Dec is months
 * 9-12), so month granularity is exact rather than a simplification. Assumes a
 * non-wrapping window (`windowStartMonth <= windowEndMonth`), enforced at config
 * load by `assertValidReapplyWindow`.
 * @param {Date} now
 * @param {{ windowStartMonth: number; windowEndMonth: number }} window
 * @returns {boolean}
 */
export const isWithinReapplyWindow = (
  now,
  { windowStartMonth, windowEndMonth }
) => {
  const month = now.getMonth() + 1

  return month >= windowStartMonth && month <= windowEndMonth
}
