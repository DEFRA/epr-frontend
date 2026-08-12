import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @param {string} backendToken
 * @param {string} organisationId
 * @returns {Promise<void>}
 */
export async function linkOrganisation(backendToken, organisationId) {
  await fetchJsonFromBackend(`/v1/organisations/${organisationId}/link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}
