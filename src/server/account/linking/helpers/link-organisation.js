import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @param {string} backendToken
 * @param {string} organisationNumber
 * @returns {Promise<void>}
 */
export const linkOrganisation = async (backendToken, organisationNumber) => {
  await backend(backendToken).post(
    path`/organisations/${organisationNumber}/link`
  )
}
