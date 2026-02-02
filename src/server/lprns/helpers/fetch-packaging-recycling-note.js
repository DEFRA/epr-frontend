import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches a single packaging recycling note by ID from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID
 * @param {string} prnId - The PRN ID
 * @param {string} idToken - JWT ID token for authorisation
 * @returns {Promise<PackagingRecyclingNote>} The packaging recycling note
 */
async function fetchPackagingRecyclingNote(
  organisationId,
  registrationId,
  prnId,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/l-packaging-recycling-notes/${encodeURIComponent(prnId)}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchPackagingRecyclingNote }

/**
 * @typedef {object} PackagingRecyclingNote
 * @property {string} id
 * @property {string} issuedToOrganisation
 * @property {number} tonnage
 * @property {string} material
 * @property {string} status
 * @property {string} createdAt
 */
