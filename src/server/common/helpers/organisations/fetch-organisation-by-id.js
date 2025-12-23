import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches organisation data by ID from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<object>} Organisation data with accreditations and registrations
 */
async function fetchOrganisationById(organisationId, idToken) {
  const path = `/v1/organisations/${organisationId}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchOrganisationById }
