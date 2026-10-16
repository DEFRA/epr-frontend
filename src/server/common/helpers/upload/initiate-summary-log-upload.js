import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import {
  accreditationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

/** @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js' */

const UPLOAD_YEAR = 2026

/**
 * Starts a summary log upload for 2026, at the accredited or registered-only
 * address.
 * @param {object} options
 * @param {RegistrationKeys} options.keys
 * @param {boolean} options.accredited
 * @param {string} options.redirectUrl
 * @param {string} options.backendToken
 * @returns {Promise<{summaryLogId: string, uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
async function initiateSummaryLogUpload({
  keys,
  accredited,
  redirectUrl,
  backendToken
}) {
  const path = accredited
    ? `${accreditationPath({ ...keys, year: String(UPLOAD_YEAR) })}/summary-log`
    : `${registrationPath(keys)}/summary-logs/${UPLOAD_YEAR}`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    body: JSON.stringify({ redirectUrl }),
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { initiateSummaryLogUpload }
