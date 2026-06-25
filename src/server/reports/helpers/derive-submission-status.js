import { SUBMISSION_STATUS } from '../constants.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 * @import { ReportingPeriod } from './fetch-reporting-periods.js'
 */

const ISO_DATE_FORMAT = 'YYYY-MM-DD'

const currentIsoDate = () =>
  new Date().toISOString().slice(0, ISO_DATE_FORMAT.length)

/**
 * Derive the submission status for a reporting period.
 *
 * Dates are compared as ISO date strings (YYYY-MM-DD), which sort
 * chronologically: a period is overdue once the current UTC date is past its
 * due date, i.e. from the 21st when the due date is the 20th.
 * @param {Pick<ReportingPeriod, 'endDate' | 'dueDate' | 'report'>} period
 * @returns {SubmissionStatusValue | null}
 */
export function deriveSubmissionStatus({ endDate, dueDate, report }) {
  if (report !== null) {
    return report.status
  }

  const today = currentIsoDate()

  const periodEnded = today.localeCompare(endDate) > 0
  if (!periodEnded) {
    return null
  }

  const overdue = today.localeCompare(dueDate) > 0

  return overdue ? SUBMISSION_STATUS.OVERDUE : SUBMISSION_STATUS.DUE
}
