import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {object} CreatePrnPayload
 * @property {string} issuedToOrganisation - The recipient organisation ID
 * @property {number} tonnage - Tonnage amount (whole number)
 * @property {string} material - Material type (e.g. 'glass', 'plastic')
 * @property {string} nation - Nation code (e.g. 'england', 'wales')
 * @property {string} wasteProcessingType - Processing type ('reprocessor' or 'exporter')
 * @property {string} [issuerNotes] - Optional notes from issuer
 */

/**
 * @typedef {object} CreatePrnResponse
 * @property {string} id - The created PRN ID
 * @property {string} [prnNumber] - The PRN number (assigned when issued)
 * @property {number} tonnage - Tonnage amount
 * @property {string} material - Material type
 * @property {string} issuedToOrganisation - Recipient organisation ID
 * @property {string} status - Current PRN status
 * @property {string} createdAt - Creation timestamp
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
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}/l-packaging-recycling-notes`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  })
}

export { createPrn }
