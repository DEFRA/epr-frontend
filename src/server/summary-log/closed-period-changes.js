/**
 * @import { LoadsByReportingPeriod } from './types.js'
 */

/**
 * Whether uploading this summary log requires an approved person to resubmit a
 * report. Drives the resubmission messaging on both the check and confirmation
 * pages. A closed period requires resubmission only when its reported figures
 * change, so this reads the backend's per-period signal
 * (periodsRequiringResubmission) rather than the raw closed-period row counts,
 * which over-warn on non-figure amendments. Tolerates an absent
 * loadsByReportingPeriod (e.g. a backend that has not populated it for this
 * status) by treating it as no resubmission needed.
 * @param {LoadsByReportingPeriod | undefined} loadsByReportingPeriod
 * @returns {boolean}
 */
export const requiresResubmission = (loadsByReportingPeriod) =>
  (loadsByReportingPeriod?.periodsRequiringResubmission?.length ?? 0) > 0
