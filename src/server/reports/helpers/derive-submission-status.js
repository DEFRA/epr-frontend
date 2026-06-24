import { SUBMISSION_STATUS } from '../constants.js'

/**
 * Derive the submission status for a reporting period.
 * @param {string} endDate - ISO date string for the period end (e.g. "2026-01-31")
 * @param {string} dueDate - ISO date string for the due date (e.g. "2026-02-20")
 * @param {{ id: string, status: import('../constants.js').SubmissionStatusValue } | null} report - persisted report, or null
 * @returns {import('../constants.js').SubmissionStatusValue | null}
 */
export function deriveSubmissionStatus(endDate, dueDate, report) {
  if (report !== null) {
    return report.status
  }

  const now = new Date()
  const periodEnded = new Date(endDate + 'T23:59:59.999Z') < now

  if (!periodEnded) {
    return null
  }

  const overdue = new Date(dueDate + 'T23:59:59.999Z') < now

  return overdue ? SUBMISSION_STATUS.OVERDUE : SUBMISSION_STATUS.DUE
}
