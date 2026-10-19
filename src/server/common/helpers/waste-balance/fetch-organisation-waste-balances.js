import { backend, path } from '#server/common/helpers/backend-client.js'

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
const fetchOrganisationWasteBalances = (
  organisationNumber,
  year,
  backendToken
) =>
  backend(backendToken).get(
    path`/organisations/${organisationNumber}/waste-balances/${year}`
  )

export { fetchOrganisationWasteBalances }
