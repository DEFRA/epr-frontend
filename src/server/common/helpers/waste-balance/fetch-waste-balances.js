import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * Fetches waste balance data for an organisation from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string[]} accreditationIds - Array of accreditation IDs to fetch balances for
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<WasteBalanceMap>} Map of accreditationId to balance data
 */
async function fetchWasteBalances(
  organisationId,
  accreditationIds,
  backendToken
) {
  if (accreditationIds.length === 0) {
    return {}
  }

  const balancesPath = path`/v1/organisations/${organisationId}/waste-balances`
  const encodedIds = accreditationIds.map(encodeURIComponent).join(',')

  return backend(backendToken).get(
    `${balancesPath}?accreditationIds=${encodedIds}`
  )
}

export { fetchWasteBalances }

/**
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 */
