import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @param {string} backendToken
 * @param {string} organisationId
 * @returns {Promise<void>}
 */
export const linkOrganisation = async (backendToken, organisationId) => {
  await backend(backendToken).post(
    path`/v1/organisations/${organisationId}/link`
  )
}
