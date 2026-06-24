import { SUBMISSION_STATUS } from '../constants.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 */

const ISO_DATE_FORMAT = 'YYYY-MM-DD'

/**
 * Derive the submission status for a reporting period.
 *
 * Dates are compared as ISO date strings (YYYY-MM-DD), which sort
 * chronologically: a period is overdue once the current UTC date is past its
 * due date, i.e. from the 21st when the due date is the 20th.
 * @param {{ endDate: string, dueDate: string, report: { id: string, status: SubmissionStatusValue } | null }} period
 * @returns {SubmissionStatusValue | null}
 */
export function deriveSubmissionStatus({ endDate, dueDate, report }) {
  if (report !== null) {
    return report.status
  }

  const today = new Date().toISOString().slice(0, ISO_DATE_FORMAT.length)
  const periodEnded = today > endDate

  if (!periodEnded) {
    return null
  }

  const overdue = today > dueDate

  return overdue ? SUBMISSION_STATUS.OVERDUE : SUBMISSION_STATUS.DUE
}
