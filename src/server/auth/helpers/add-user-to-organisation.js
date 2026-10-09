import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * Adds the authenticated user to an organisation via the backend API
 * @param {string} organisationId
 * @param {string} backendToken
 * @returns {Promise<void>}
 */
export async function addUserToOrganisation(organisationId, backendToken) {
  await backend(backendToken).put(
    path`/v1/organisations/${organisationId}/user`
  )
}
