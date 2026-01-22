import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches waste balance data for an organisation from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<WasteBalanceMap>} Map of accreditationId to balance data
 */
async function fetchWasteBalances(organisationId, idToken) {
  const path = `/v1/organisations/${organisationId}/waste-balances`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchWasteBalances }

/**
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 */
