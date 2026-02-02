import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {object} UpdatePrnStatusPayload
 * @property {string} status - The new status (e.g. 'awaiting_authorisation')
 */

/**
 * @typedef {object} UpdatePrnStatusResponse
 * @property {string} id - The PRN ID
 * @property {string} [prnNumber] - The PRN number
 * @property {number} tonnage - Tonnage amount
 * @property {string} material - Material type
 * @property {string} issuedToOrganisation - Recipient organisation ID
 * @property {string} status - Current PRN status
 * @property {string} updatedAt - Update timestamp
 */

/**
 * Updates the status of a PRN/PERN via the backend API
 * @param {string} organisationId - The issuing organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} prnId - The PRN ID
 * @param {UpdatePrnStatusPayload} payload - Status update data
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<UpdatePrnStatusResponse>}
 */
async function updatePrnStatus(
  organisationId,
  registrationId,
  prnId,
  payload,
  idToken
) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/l-packaging-recycling-notes/${prnId}/status`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  })
}

export { updatePrnStatus }
