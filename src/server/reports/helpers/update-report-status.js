import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Transitions a report's status via the backend POST endpoint.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {string} status - The target status (e.g. 'ready_to_submit')
 * @param {number} version - Report version for optimistic locking
 * @param {string} idToken
 * @returns {Promise<unknown>}
 */
export async function updateReportStatus(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  status,
  version,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}/status`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ status, version })
  })
}
