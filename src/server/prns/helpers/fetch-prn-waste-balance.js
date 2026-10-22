import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchAccreditationBalance } from '#server/common/helpers/waste-balance/fetch-accreditation-balance.js'
import { toYear } from '#server/common/helpers/year.js'

/**
 * The accreditation's balance for the year, or null when it cannot be read.
 * @param {{
 *   keys: AccreditationKeys,
 *   accreditationNumber: string,
 *   backendToken: BackendToken,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<WasteBalance | null>}
 */
export const fetchPrnWasteBalance = ({
  keys,
  accreditationNumber,
  backendToken,
  logger
}) =>
  fetchAccreditationBalance({
    organisationNumber: toOrganisationNumber(keys.organisationNumber),
    year: toYear(Number(keys.year)),
    accreditationNumber,
    backendToken,
    logger
  })

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */
