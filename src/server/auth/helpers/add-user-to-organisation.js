import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

/**
 * Adds the authenticated user to an organisation via the backend API
 * @param {string} organisationNumber
 * @param {BackendToken} backendToken
 * @returns {Promise<void>}
 */
export const addUserToOrganisation = async (
  organisationNumber,
  backendToken
) => {
  await backend(backendToken).put(
    path`/organisations/${organisationNumber}/user`
  )
}
