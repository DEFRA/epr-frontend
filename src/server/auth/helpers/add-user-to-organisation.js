import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Adds the authenticated user to an organisation via the backend API
 * @param {string} organisationId
 * @param {string} backendToken
 * @returns {Promise<void>}
 */
export async function addUserToOrganisation(organisationId, backendToken) {
  await fetchJsonFromBackend(`/v1/organisations/${organisationId}/user`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}
