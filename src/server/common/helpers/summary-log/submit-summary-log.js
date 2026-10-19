import { backend } from '#server/common/helpers/backend-client.js'
import { registrationPath } from '#server/reports/helpers/report-paths.js'

/** @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js' */

/**
 * Submits summary log to EPR Backend
 * @param {RegistrationKeys} keys
 * @param {string} summaryLogId
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<{status: string, accreditationNumber: string}>}
 */
const submitSummaryLog = (keys, summaryLogId, backendToken) =>
  backend(backendToken).post(
    `${registrationPath(keys)}/summary-logs/${encodeURIComponent(summaryLogId)}/submit`
  )

export { submitSummaryLog }
