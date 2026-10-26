import { backend } from '#server/common/helpers/backend-client.js'
import {
  accreditationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'
import { fixedYear } from '#server/common/helpers/year.js'

/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */
/** @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js' */

/**
 * Starts a summary log upload for 2026, at the accredited or registered-only
 * address.
 * @param {object} options
 * @param {RegistrationKeys} options.keys
 * @param {boolean} options.accredited
 * @param {string} options.redirectUrl
 * @param {BackendToken} options.backendToken
 * @returns {Promise<{summaryLogId: string, uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
const initiateSummaryLogUpload = ({
  keys,
  accredited,
  redirectUrl,
  backendToken
}) =>
  backend(backendToken).post(
    accredited
      ? `${accreditationPath({ ...keys, year: fixedYear })}/summary-log`
      : `${registrationPath(keys)}/summary-logs/${fixedYear}`,
    { redirectUrl }
  )

export { initiateSummaryLogUpload }
