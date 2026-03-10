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
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports`

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
 *   endDate: string
 * }} ReportingPeriod
 */

/**
 * @typedef {{
 *   cadence: import('../constants.js').CADENCE_MONTHLY | import('../constants.js').CADENCE_QUARTERLY,
 *   periods: ReportingPeriod[]
 * }} ReportingPeriodsResponse
 */
