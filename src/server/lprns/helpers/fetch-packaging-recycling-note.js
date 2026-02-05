import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches a single packaging recycling note by ID from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnId - The PRN ID
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<PackagingRecyclingNote>} The packaging recycling note
 */
async function fetchPackagingRecyclingNote(
  organisationId,
  registrationId,
  accreditationId,
  prnId,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}/packaging-recycling-notes/${encodeURIComponent(prnId)}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchPackagingRecyclingNote }

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
 * @property {string|null} notes
 * @property {boolean} isDecemberWaste
 * @property {string} wasteProcessingType
 * @property {string} processToBeUsed
 * @property {number|null} accreditationYear
 * @property {string|null} issuedAt
 * @property {{id: string, name: string, position: string}|null} authorisedBy
 */
