import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 */

/**
 * Fetches waste balance data for an organisation from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string[]} accreditationIds - Array of accreditation IDs to fetch balances for
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<WasteBalanceMap>} Map of accreditationId to balance data
 */
const fetchWasteBalances = async (
  organisationId,
  accreditationIds,
  backendToken
) => {
  if (accreditationIds.length === 0) {
    return {}
  }

  return backend(backendToken).get(
    path`/v1/organisations/${organisationId}/waste-balances`,
    { query: { accreditationIds: accreditationIds.join(',') } }
  )
}

export { fetchWasteBalances }
