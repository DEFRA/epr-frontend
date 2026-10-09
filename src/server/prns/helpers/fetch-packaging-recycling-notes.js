import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * Fetches packaging recycling notes for an accreditation from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<PackagingRecyclingNote[]>} List of packaging recycling notes
 */
async function fetchPackagingRecyclingNotes(
  organisationId,
  registrationId,
  accreditationId,
  backendToken
) {
  return backend(backendToken).get(
    path`/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  )
}

export { fetchPackagingRecyclingNotes }

/**
 * @typedef {object} IssuedToOrganisation
 * @property {string} id
 * @property {string} name
 * @property {string} [tradingName]
 */

/**
 * @typedef {object} PackagingRecyclingNote
 * @property {string} id
 * @property {string|null} prnNumber
 * @property {IssuedToOrganisation} issuedToOrganisation
 * @property {number} tonnage
 * @property {string} material
 * @property {string} status
 * @property {string} createdAt
 * @property {string|null} issuedAt
 * @property {string} wasteProcessingType
 * @property {string} processToBeUsed
 * @property {boolean} isDecemberWaste
 */
