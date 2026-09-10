import { fetchDecemberPrnEligibility } from '#server/prns/helpers/fetch-december-prn-eligibility.js'

/** @import { TypedLogger } from '#server/common/helpers/logging/logger.js' */
/** @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js' */

/**
 * @typedef {{ december: number, nonDecember: number, total: number }} DecemberBalanceBreakdown
 */

/**
 * Whether an operator surface should break the available balance into its
 * December and non-December portions (PAE-1921): only for an accreditation
 * whose type accrues a December pool (exporter or reprocessor on input, i.e.
 * one that does not declare December waste manually), and only within the
 * December to January window. Both halves are decided by the backend.
 *
 * The panel is display-only, so a failed eligibility read falls back to the
 * single balance rather than failing the page.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<boolean>}
 */
async function showsDecemberBalance({
  organisationId,
  registrationId,
  accreditationId,
  backendToken,
  logger
}) {
  try {
    const { declaresDecemberWasteManually, windowOpen } =
      await fetchDecemberPrnEligibility(
        organisationId,
        registrationId,
        accreditationId,
        backendToken
      )

    return windowOpen && !declaresDecemberWasteManually
  } catch (error) {
    logger.error({
      message: 'Failed to fetch December PRN eligibility',
      err: error
    })
    return false
  }
}

/**
 * The backend omits the December fields entirely for an accreditation that has
 * never accrued December tonnage, so an eligible operator's empty pool still
 * reads as zero here rather than dropping the breakdown.
 * @param {Partial<WasteBalance> | null | undefined} wasteBalance
 * @returns {DecemberBalanceBreakdown}
 */
function toDecemberBalanceBreakdown(wasteBalance) {
  const total = wasteBalance?.availableAmount ?? 0
  const december = wasteBalance?.decemberAvailableAmount ?? 0

  return { december, nonDecember: total - december, total }
}

export { showsDecemberBalance, toDecemberBalanceBreakdown }
