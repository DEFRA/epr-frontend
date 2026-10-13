import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */
/** @import { WasteBalanceMap } from './types.js' */

/**
 * Fetches the balance of each accreditation for the year
 * @param {OrganisationNumber} organisationNumber
 * @param {Year} year
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<WasteBalanceMap>} Balances keyed by accreditation number
 */
async function fetchOrganisationWasteBalances(
  organisationNumber,
  year,
  backendToken
) {
  const path = `/organisations/${organisationNumber}/waste-balances/${year}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { fetchOrganisationWasteBalances }
