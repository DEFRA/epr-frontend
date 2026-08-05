/**
 * @import { LoadsByReportingPeriod, PeriodStatusByChange } from './types.js'
 */

/**
 * Total loads a change type carries, across both balance-affecting and
 * non-balance-affecting buckets.
 * @param {PeriodStatusByChange} change
 * @returns {number}
 */
const changeCount = (change) =>
  change.balanceAffecting.count + change.nonBalanceAffecting.count

/**
 * Whether the summary log adds or amends any rows in an already-reported
 * (closed) period. Drives the closed-period adjustment messaging on both the
 * check and confirmation pages. Tolerates an absent loadsByReportingPeriod
 * (e.g. a backend that has not populated it for this status) by treating it as
 * no closed-period change.
 * @param {LoadsByReportingPeriod | undefined} loadsByReportingPeriod
 * @returns {boolean}
 */
export const hasClosedPeriodChanges = (loadsByReportingPeriod) => {
  const closed = loadsByReportingPeriod?.closedPeriodLoads
  if (closed === undefined) {
    return false
  }
  return changeCount(closed.added) > 0 || changeCount(closed.adjusted) > 0
}
