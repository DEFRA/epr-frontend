import { fetchOrganisationWasteBalances } from './fetch-organisation-waste-balances.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { WasteBalance } from './types.js'
 */

/**
 * The accreditation's balance for the year, or null when it cannot be read.
 * @param {{
 *   organisationNumber: OrganisationNumber,
 *   year: Year,
 *   accreditationNumber: string,
 *   backendToken: string,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<WasteBalance | null>}
 */
export const fetchAccreditationBalance = async ({
  organisationNumber,
  year,
  accreditationNumber,
  backendToken,
  logger
}) => {
  try {
    const wasteBalanceMap = await fetchOrganisationWasteBalances(
      organisationNumber,
      year,
      backendToken
    )

    return wasteBalanceMap[accreditationNumber] ?? null
  } catch (error) {
    logger.error({ message: 'Failed to fetch waste balance', err: error })
    return null
  }
}
