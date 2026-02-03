//import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { stubPrns } from './stub-prns.js'

/**
 * Fetches a PRN from EPR Backend for an accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnId - The PRN ID
 * @returns {Promise<object|null>}
 */
async function fetchPrn(
  organisationId,
  accreditationId,
  prnId
  //, idToken
) {
  // const path = `/v1/organisations/${organisationId}/accreditations/${accreditationId}/prns/${prnId}`
  //   return fetchJsonFromBackend(path, {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${idToken}`
  //     }
  //   })

  return stubPrns.find((prn) => prn.id === prnId) ?? null
}

export { fetchPrn }
