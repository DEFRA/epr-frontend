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
 * (closed) period. This over-warns on non-figure amendments, so it is only the
 * fallback used until the backend populates the narrowed
 * periodsRequiringResubmission signal.
 * @param {LoadsByReportingPeriod} loadsByReportingPeriod
 * @returns {boolean}
 */
const hasClosedPeriodChanges = ({ closedPeriodLoads }) =>
  changeCount(closedPeriodLoads.added) > 0 ||
  changeCount(closedPeriodLoads.adjusted) > 0

/**
 * Whether uploading this summary log requires an approved person to resubmit a
 * report. Drives the resubmission messaging on both the check and confirmation
 * pages. A closed period requires resubmission only when its reported figures
 * change, so this prefers the backend's per-period signal
 * (periodsRequiringResubmission) rather than the raw closed-period row counts,
 * which over-warn on non-figure amendments. When the backend has not yet shipped
 * that field (absent, distinct from an empty array), it falls back to the raw
 * closed-period counts so the messaging still appears until the narrowed signal
 * is deployed. Tolerates an absent loadsByReportingPeriod (e.g. a backend that
 * has not populated it for this status) by treating it as no resubmission needed.
 * @param {LoadsByReportingPeriod | undefined} loadsByReportingPeriod
 * @returns {boolean}
 */
export const requiresResubmission = (loadsByReportingPeriod) => {
  if (loadsByReportingPeriod === undefined) {
    return false
  }
  const periods = loadsByReportingPeriod.periodsRequiringResubmission
  if (periods === undefined) {
    return hasClosedPeriodChanges(loadsByReportingPeriod)
  }
  return periods.length > 0
}
