import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * Fetches available reporting periods for a registration from the backend.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} backendToken
 * @returns {Promise<ReportingPeriodsResponse>}
 */
export async function fetchReportingPeriods(
  organisationId,
  registrationId,
  backendToken
) {
  return backend(backendToken).get(
    path`/v1/organisations/${organisationId}/registrations/${registrationId}/reports/calendar`
  )
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
 */
