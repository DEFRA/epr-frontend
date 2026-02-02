//import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { stubPrns } from './stub-prns.js'

/**
 * Fetches a PRN from EPR Backend for an accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnNumber - The prnNumber
 * @returns {Promise<object|null>}
 */
async function fetchPrn(
  organisationId,
  accreditationId,
  prnNumber
  //, idToken
) {
  // const path = `/v1/organisations/${organisationId}/accreditations/${accreditationId}/prns/${prnNumber}`
  //   return fetchJsonFromBackend(path, {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${idToken}`
  //     }
  //   })

  return stubPrns.find((prn) => prn.prnNumber === prnNumber) ?? null
}

export { fetchPrn }
