import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Links an organisation to the current user
 * @param {Request} request - Hapi request object
 * @param {string} organisationId
 * @returns {Promise<void>}
 */
export async function linkOrganisation(request, organisationId) {
  await fetchJsonFromBackend(
    request,
    `/v1/organisations/${organisationId}/link`,
    {
      method: 'POST'
    }
  )
}
