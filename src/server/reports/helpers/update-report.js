import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {string} idToken
 * @returns {Promise<unknown>}
 */
export async function updateReport(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  fields,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}`

  return fetchJsonFromBackend(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(fields)
  })
}
