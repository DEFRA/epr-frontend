import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

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

  const encodedIds = accreditationIds.map(encodeURIComponent).join(',')
  const path = `/v1/organisations/${organisationId}/waste-balances?accreditationIds=${encodedIds}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { fetchWasteBalances }

/**
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 */
