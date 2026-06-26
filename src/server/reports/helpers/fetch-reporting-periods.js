import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches available reporting periods for a registration from the backend.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} idToken
 * @returns {Promise<ReportingPeriodsResponse>}
 */
export async function fetchReportingPeriods(
  organisationId,
  registrationId,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/calendar`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` }
  })
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
