import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @import { Organisation } from '#types/organisation.d.ts'
 */

/**
 * @param {string} idToken
 * @param {string} organisationId
 * @returns {Promise<void>}
 */
export async function linkOrganisation(idToken, organisationId) {
  await fetchJsonFromBackend(`/v1/organisations/${organisationId}/link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}
