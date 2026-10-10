import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @typedef {object} IssuedToOrganisation
 * @property {string} id - The recipient organisation ID
 * @property {string} name - The recipient organisation name
 * @property {string | null} [tradingName] - The recipient organisation trading name
 * @property {string} [registrationType] - Producer/compliance scheme classification
 */

/**
 * @typedef {object} CreatePrnPayload
 * @property {IssuedToOrganisation} issuedToOrganisation - The recipient organisation
 * @property {number} tonnage - Tonnage amount (whole number)
 * @property {string} [notes] - Optional notes from issuer
 * @property {boolean} [isDecemberWaste] - Whether this PRN relates to December waste
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
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<CreatePrnResponse>}
 */
const createPrn = (
  organisationId,
  registrationId,
  accreditationId,
  payload,
  backendToken
) =>
  backend(backendToken).post(
    path`/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`,
    payload
  )

export { createPrn }
