import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @param {string} backendToken
 * @param {string} organisationNumber
 * @returns {Promise<void>}
 */
export async function linkOrganisation(backendToken, organisationNumber) {
  await fetchJsonFromBackend(`/organisations/${organisationNumber}/link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}
