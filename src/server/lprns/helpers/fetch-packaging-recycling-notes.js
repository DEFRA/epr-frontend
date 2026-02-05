import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches packaging recycling notes for an accreditation from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<PackagingRecyclingNote[]>} List of packaging recycling notes
 */
async function fetchPackagingRecyclingNotes(
  organisationId,
  registrationId,
  accreditationId,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}/packaging-recycling-notes`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
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
