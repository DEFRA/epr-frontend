import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */
/** @import { WasteBalance, WasteBalanceMap } from './types.js' */

/**
 * Fetches the balance of each registration's accreditation for the year
 * @param {OrganisationNumber} organisationNumber
 * @param {Year} year
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<WasteBalanceMap>} Balances keyed by registration number
 */
async function fetchOrganisationWasteBalances(
  organisationNumber,
  year,
  backendToken
) {
  const path = `/organisations/${organisationNumber}/waste-balances?year=${year}`

  const balances =
    /** @type {Array<WasteBalance & { registrationNumber: string }>} */ (
      await fetchJsonFromBackend(path, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      })
    )

  return Object.fromEntries(
    balances.map(({ registrationNumber, ...balance }) => [
      registrationNumber,
      balance
    ])
  )
}

export { fetchOrganisationWasteBalances }
