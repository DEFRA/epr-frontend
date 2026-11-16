/**
 * @import { LoadsByReportingPeriod } from './types.js'
 */

/**
 * Whether uploading this summary log requires an approved person to resubmit a
 * report. Drives the resubmission messaging on both the check and confirmation
 * pages.
 * @param {LoadsByReportingPeriod | undefined} loadsByReportingPeriod
 * @returns {boolean}
 */
export const requiresResubmission = (loadsByReportingPeriod) =>
  (loadsByReportingPeriod?.periodsRequiringResubmission.length ?? 0) > 0
