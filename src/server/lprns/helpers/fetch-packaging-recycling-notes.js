import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches packaging recycling notes for a registration from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<PackagingRecyclingNote[]>} List of packaging recycling notes
 */
async function fetchPackagingRecyclingNotes(
  organisationId,
  registrationId,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/l-packaging-recycling-notes`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchPackagingRecyclingNotes }

/**
 * @typedef {object} PackagingRecyclingNote
 * @property {string} id
 * @property {string} issuedToOrganisation
 * @property {number} tonnage
 * @property {string} material
 * @property {string} status
 * @property {string} createdAt
 */
