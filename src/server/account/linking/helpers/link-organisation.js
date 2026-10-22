import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

/**
 * @param {BackendToken} backendToken
 * @param {string} organisationNumber
 * @returns {Promise<void>}
 */
export const linkOrganisation = async (backendToken, organisationNumber) => {
  await backend(backendToken).post(
    path`/organisations/${organisationNumber}/link`
  )
}
