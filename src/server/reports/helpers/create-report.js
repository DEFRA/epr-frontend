import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {{
 *   id: string,
 *   status: string
 * }} CreateReportResponse
 */

/**
 * Creates an in-progress report for a specific period via the backend API.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {string} idToken
 * @returns {Promise<CreateReportResponse>}
 */
export async function createReport(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` }
  })
}
