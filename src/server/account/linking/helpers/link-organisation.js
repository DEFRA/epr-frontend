import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 */

/**
 * @param {BackendToken} backendToken
 * @param {OrganisationNumber} organisationNumber
 * @returns {Promise<void>}
 */
export const linkOrganisation = async (backendToken, organisationNumber) => {
  await backend(backendToken).post(
    path`/organisations/${organisationNumber}/link`
  )
}
