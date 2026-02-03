//import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { stubPrns } from './stub-prns.js'

/**
 * Fetches PRNs from EPR Backend for an accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @returns {Promise<{items: Array, hasMore: boolean}>}
 */
async function fetchPrns(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  organisationId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accreditationId
  //, idToken
) {
  // const path = `/v1/organisations/${organisationId}/accreditations/${accreditationId}/prns`
  //   return fetchJsonFromBackend(path, {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${idToken}`
  //     }
  //   })

  return { items: stubPrns, hasMore: false }
}

export { fetchPrns }
