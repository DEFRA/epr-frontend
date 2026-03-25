import { SUBMISSION_STATUS } from '../constants.js'

/**
 * Derive the submission status for a reporting period.
 * @param {string} endDate - ISO date string for the period end (e.g. "2026-01-31")
 * @param {{ id: string, status: string } | null} report - persisted report, or null
 * @returns {import('../constants.js').SubmissionStatusValue | null}
 */
export function deriveSubmissionStatus(endDate, report) {
  if (report !== null) {
    return report.status
  }

  const periodEnded = new Date(endDate + 'T23:59:59.999Z') < new Date()

  if (periodEnded) {
    return SUBMISSION_STATUS.DUE
  }

  return null
}
