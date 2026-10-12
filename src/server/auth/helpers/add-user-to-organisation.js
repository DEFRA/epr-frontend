import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Adds the authenticated user to an organisation via the backend API
 * @param {string} organisationNumber
 * @param {string} backendToken
 * @returns {Promise<void>}
 */
export async function addUserToOrganisation(organisationNumber, backendToken) {
  await fetchJsonFromBackend(`/organisations/${organisationNumber}/user`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}
