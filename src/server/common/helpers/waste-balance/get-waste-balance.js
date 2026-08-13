import { fetchWasteBalances } from './fetch-waste-balances.js'

/** @import { TypedLogger } from '#server/common/helpers/logging/logger.js' */

/**
 * Fetches waste balance for a single accreditation with error handling
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} backendToken - Bearer token for the backend
 * @param {TypedLogger} logger - Logger instance for error reporting
 * @returns {Promise<WasteBalance|null>} Balance data or null if unavailable
 */
async function getWasteBalance(
  organisationId,
  accreditationId,
  backendToken,
  logger
) {
  try {
    const wasteBalanceMap = await fetchWasteBalances(
      organisationId,
      [accreditationId],
      backendToken
    )

    return wasteBalanceMap[accreditationId] ?? null
  } catch (error) {
    logger.error({ message: 'Failed to fetch waste balance', err: error })
    return null
  }
}

export { getWasteBalance }

/**
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
