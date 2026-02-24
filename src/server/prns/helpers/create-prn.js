import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {object} IssuedToOrganisation
 * @property {string} id - The recipient organisation ID
 * @property {string} name - The recipient organisation name
 * @property {string} [tradingName] - The recipient organisation trading name
 */

/**
 * @typedef {object} CreatePrnPayload
 * @property {IssuedToOrganisation} issuedToOrganisation - The recipient organisation
 * @property {number} tonnage - Tonnage amount (whole number)
 * @property {string} [notes] - Optional notes from issuer
 */

/**
 * @typedef {object} CreatePrnResponse
 * @property {string} id - The created PRN ID
 * @property {string|null} prnNumber - The PRN number (assigned when issued)
 * @property {number} tonnage - Tonnage amount
 * @property {string} material - Material type
 * @property {IssuedToOrganisation} issuedToOrganisation - Recipient organisation
 * @property {string} status - Current PRN status
 * @property {string} createdAt - Creation timestamp
 * @property {string} processToBeUsed - The recycling process code
 * @property {boolean} isDecemberWaste - Whether this is December waste
 * @property {string} wasteProcessingType - Processing type ('reprocessor' or 'exporter')
 */

/**
 * Creates a new PRN/PERN via the backend API
 * @param {string} organisationId - The issuing organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} accreditationId - The accreditation ID
 * @param {CreatePrnPayload} payload - PRN creation data
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<CreatePrnResponse>}
 */
async function createPrn(
  organisationId,
  registrationId,
  accreditationId,
  payload,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}/packaging-recycling-notes`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  })
}

export { createPrn }
