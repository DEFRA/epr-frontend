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
 * @typedef {{
 *   year: number,
 *   period: number,
 *   startDate: string,
 *   endDate: string,
 *   dueDate: string,
 *   report: { id: string, status: import('../constants.js').SubmissionStatusValue } | null
 * }} ReportingPeriod
 */

/**
 * @typedef {{
 *   cadence: import('../constants.js').CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingPeriodsResponse
 */
