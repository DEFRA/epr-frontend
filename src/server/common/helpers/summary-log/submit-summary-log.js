import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { registrationPath } from '#server/reports/helpers/report-paths.js'

/** @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js' */

/**
 * Submits summary log to EPR Backend
 * @param {RegistrationKeys} keys
 * @param {string} summaryLogId
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<{status: string, accreditationNumber: string}>}
 */
async function submitSummaryLog(keys, summaryLogId, backendToken) {
  const path = `${registrationPath(keys)}/summary-logs/${summaryLogId}/submit`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { submitSummaryLog }
