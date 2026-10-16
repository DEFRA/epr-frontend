import { backend } from '#server/common/helpers/backend-client.js'

import { reportsCalendarApiPath } from './report-paths.js'

/**
 * Fetches available reporting periods for a registration by its natural keys.
 * @param {RegistrationKeys} keys
 * @param {string} backendToken
 * @returns {Promise<ReportingPeriodsResponse>}
 */
export const fetchReportingPeriodsByNumber = (keys, backendToken) =>
  backend(backendToken).get(reportsCalendarApiPath(keys))

/**
 * @typedef {{ name: string }} ReportSubmitter
 */

/**
 * @typedef {{
 *   id: string,
 *   status: SubmissionStatusValue,
 *   submittedAt: string | null,
 *   submittedBy: ReportSubmitter | null
 * }} ReportListItem
 */

/**
 * @typedef {{
 *   year: number,
 *   period: number,
 *   submissionNumber: number,
 *   startDate: string,
 *   endDate: string,
 *   dueDate: string,
 *   periodStatus: SubmissionStatusValue,
 *   report: ReportListItem | null
 * }} ReportingPeriod
 */

/**
 * @typedef {{
 *   cadence: CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingPeriodsResponse
 */

/**
 * @import { CadenceValue, SubmissionStatusValue } from '../constants.js'
 * @import { RegistrationKeys } from './report-paths.js'
 */
