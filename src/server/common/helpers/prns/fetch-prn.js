//import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

// this will be updated when the real api is available
/**
 * Fetches PRNs from EPR Backend for an accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnNumber - The prnNumber
 * @returns {Promise<{items: Array, hasMore: boolean}>}
 */
async function fetchPrn(
  organisationId,
  accreditationId,
  prnNumber
  //, idToken
) {
  const path = `/v1/organisations/${organisationId}/accreditations/${accreditationId}/prns/${prnNumber}`

  return {
    prnNumber,
    issuedToOrganisation: 'Acme Packaging Solutions Ltd',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '',
    issuerNotes: `retrieved from ${path}`,
    tonnageValue: 150,
    isDecemberWaste: 'No',
    authorisedBy: '',
    position: ''
  }
  //   return fetchJsonFromBackend(path, {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${idToken}`
  //     }
  //   })
}

export { fetchPrn }
