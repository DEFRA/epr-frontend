import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {object} UpdatePrnStatusPayload
 * @property {string} status - The new status (e.g. 'awaiting_authorisation')
 */

/**
 * @typedef {object} IssuedToOrganisation
 * @property {string} id
 * @property {string} name
 * @property {string} [tradingName]
 */

/**
 * @typedef {object} UpdatePrnStatusResponse
 * @property {string} id - The PRN ID
 * @property {string|null} prnNumber - The PRN number
 * @property {number} tonnage - Tonnage amount
 * @property {string} material - Material type
 * @property {IssuedToOrganisation} issuedToOrganisation - Recipient organisation
 * @property {string} status - Current PRN status
 * @property {string} updatedAt - Update timestamp
 * @property {string} wasteProcessingType - Processing type
 * @property {string} processToBeUsed - The recycling process code
 * @property {boolean} isDecemberWaste - Whether this is December waste
 */

/**
 * Updates the status of a PRN/PERN via the backend API
 * @param {string} organisationId - The issuing organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnId - The PRN ID
 * @param {UpdatePrnStatusPayload} payload - Status update data
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<UpdatePrnStatusResponse>}
 */
async function updatePrnStatus(
  organisationId,
  registrationId,
  accreditationId,
  prnId,
  payload,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}/packaging-recycling-notes/${encodeURIComponent(prnId)}/status`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  })
}

export { updatePrnStatus }
