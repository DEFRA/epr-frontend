import { fetchWasteBalances } from './fetch-waste-balances.js'

/**
 * Fetches waste balance for a single accreditation with error handling
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} idToken - JWT ID token for authorization
 * @param {import('#server/common/helpers/logging/logger.js').TypedLogger} logger - Logger instance for error reporting
 * @returns {Promise<WasteBalance|null>} Balance data or null if unavailable
 */
async function getWasteBalance(
  organisationId,
  accreditationId,
  idToken,
  logger
) {
  try {
    const wasteBalanceMap = await fetchWasteBalances(
      organisationId,
      [accreditationId],
      idToken
    )

    return wasteBalanceMap[accreditationId] ?? null
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch waste balance')
    return null
  }
}

export { getWasteBalance }

/**
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
