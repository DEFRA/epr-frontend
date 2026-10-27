import { backend } from '#server/common/helpers/backend-client.js'

import { reportsCalendarApiPath } from './report-paths.js'

/**
 * Fetches a registration's reporting calendar for one year by its natural keys.
 * @param {RegistrationYearKeys} keys
 * @param {BackendToken} backendToken
 * @returns {Promise<YearCalendarResponse>}
 */
export const fetchYearCalendar = (keys, backendToken) =>
  backend(backendToken).get(reportsCalendarApiPath(keys))

/**
 * Fetches a registration's registered-only and accredited periods for one year
 * as one list, in date order, as a registration that changed type mid-year owes
 * both.
 * @param {RegistrationYearKeys} keys
 * @param {BackendToken} backendToken
 * @returns {Promise<ReportingPeriod[]>}
 */
export const fetchReportingPeriods = async (keys, backendToken) => {
  const { registeredOnly, accredited } = await fetchYearCalendar(
    keys,
    backendToken
  )
  return [
    ...(registeredOnly?.reportingPeriods ?? []),
    ...(accredited?.reportingPeriods ?? [])
  ].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

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
 *   year: Year,
 *   cadence: CadenceValue,
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
 * Each kind is absent when the registration has no ended period of it in the
 * year.
 * @typedef {{
 *   year: Year,
 *   registeredOnly?: { reportingPeriods: ReportingPeriod[] },
 *   accredited?: {
 *     accreditationNumber: AccreditationNumber,
 *     reportingPeriods: ReportingPeriod[]
 *   }
 * }} YearCalendarResponse
 */

/**
 * @import { CadenceValue, SubmissionStatusValue } from '../constants.js'
 * @import { RegistrationYearKeys } from './report-paths.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { AccreditationNumber } from '#server/common/helpers/accreditation-number.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */
