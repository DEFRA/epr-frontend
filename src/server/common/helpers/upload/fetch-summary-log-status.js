import { summaryLogStatusResponseSchema } from '#domain/summary-logs/loads-schema.js'
import { backend } from '#server/common/helpers/backend-client.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { registrationPath } from '#server/reports/helpers/report-paths.js'

/**
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { SummaryLogStatusResponse } from '#server/summary-log/types.js'
 */

/**
 * Keeps the validated value even when it fails, so backend drift degrades the
 * page rather than failing it, and logs the violation so the drift is seen.
 * @param {unknown} payload
 * @returns {SummaryLogStatusResponse}
 */
const tolerantly = (payload) => {
  const { value, error } = summaryLogStatusResponseSchema.validate(payload, {
    stripUnknown: true
  })

  if (error) {
    createLogger().warn({
      message: `Summary log status response failed validation: ${error.message}`
    })
  }

  return value
}

/**
 * Fetches summary log status from EPR Backend
 * @param {RegistrationKeys} keys
 * @param {string} summaryLogId
 * @param {object} options
 * @param {string} options.backendToken - Bearer token for the backend
 * @returns {Promise<SummaryLogStatusResponse>}
 */
const fetchSummaryLogStatus = (keys, summaryLogId, { backendToken }) =>
  backend(backendToken).get(
    `${registrationPath(keys)}/summary-logs/${encodeURIComponent(summaryLogId)}`,
    { parse: tolerantly }
  )

export { fetchSummaryLogStatus }
