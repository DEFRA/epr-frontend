import { toYear } from '#server/common/helpers/year.js'

import { reportingPeriodNow } from './reporting-period.js'

/** @import { Year } from '#server/common/helpers/year.js' */

const FIRST_YEAR = 2026

/**
 * Every year with a finished month, newest first.
 * @returns {Year[]}
 */
export const offeredYears = () => {
  const latest = reportingPeriodNow().year
  return Array.from({ length: latest - FIRST_YEAR + 1 }, (_, index) =>
    toYear(latest - index)
  )
}
