import { fetchDecemberPrnEligibility } from '#server/prns/helpers/fetch-december-prn-eligibility.js'

/** @import { TypedLogger } from '#server/common/helpers/logging/logger.js' */
/** @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js' */

/**
 * @typedef {{ december: number, nonDecember: number, total: number }} DecemberBalanceBreakdown
 */

/**
 * Whether an operator surface should break the available balance into its
 * December and non-December portions (PAE-1921): only for an accreditation
 * whose type resolves to the December pool (exporter or reprocessor on input,
 * `mode: 'pool'`; a reprocessor on output is `mode: 'manual'` and keeps its
 * single balance), and only within the December to January window. Both
 * halves are decided by the backend.
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
    const { mode, windowOpen } = await fetchDecemberPrnEligibility(
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    )

    return windowOpen && mode === 'pool'
  } catch (error) {
    logger.error({
      message: 'Failed to fetch December PRN eligibility',
      err: error
    })
    return false
  }
}

/**
 * Both split figures are served by the backend, which owns the arithmetic.
 * When an accreditation has never accrued December tonnage the backend omits
 * the December fields entirely: there is no December portion, so December reads
 * as zero and the whole available amount is non-December (the eligible-but-
 * empty zero state, which still shows the breakdown rather than dropping it).
 * @param {Partial<WasteBalance> | null | undefined} wasteBalance
 * @returns {DecemberBalanceBreakdown}
 */
function toDecemberBalanceBreakdown(wasteBalance) {
  const total = wasteBalance?.availableAmount ?? 0
  const december = wasteBalance?.decemberAvailableAmount ?? 0
  const nonDecember = wasteBalance?.nonDecemberAvailableAmount ?? total

  return { december, nonDecember, total }
}

export { showsDecemberBalance, toDecemberBalanceBreakdown }
