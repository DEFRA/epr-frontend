import { backend } from '#server/common/helpers/backend-client.js'
import { registrationPath } from '#server/reports/helpers/report-paths.js'

/** @import { AccreditationNumber } from '#server/common/helpers/accreditation-number.js' */
/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */
/** @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js' */

/**
 * Submits summary log to EPR Backend
 * @param {RegistrationKeys} keys
 * @param {string} summaryLogId
 * @param {BackendToken} backendToken
 * @returns {Promise<{status: string, accreditationNumber: AccreditationNumber}>}
 */
const submitSummaryLog = (keys, summaryLogId, backendToken) =>
  backend(backendToken).post(
    `${registrationPath(keys)}/summary-logs/${encodeURIComponent(summaryLogId)}/submit`
  )

export { submitSummaryLog }
