import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches PRNs from EPR Backend for an accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<{items: Array, hasMore: boolean}>}
 */
async function fetchPrns(organisationId, accreditationId, idToken) {
  const path = `/v1/organisations/${organisationId}/accreditations/${accreditationId}/prns`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchPrns }
