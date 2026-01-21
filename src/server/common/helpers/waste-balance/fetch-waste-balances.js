import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches waste balance data for given accreditation IDs from EPR Backend
 * @param {string[]} accreditationIds - Array of accreditation IDs
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<WasteBalanceMap>} Map of accreditationId to balance data
 */
async function fetchWasteBalances(accreditationIds, idToken) {
  if (!accreditationIds || accreditationIds.length === 0) {
    return {}
  }

  const path = `/v1/waste-balance?accreditationIds=${accreditationIds.join(',')}`

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
