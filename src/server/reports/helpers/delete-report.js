import { deleteFromBackend } from '#server/common/helpers/delete-from-backend.js'

/**
 * Deletes a report for a specific period via the backend API.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {string} idToken
 * @returns {Promise<void>}
 */
export async function deleteReport(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}`

  return deleteFromBackend(path, {
    headers: { Authorization: `Bearer ${idToken}` }
  })
}
