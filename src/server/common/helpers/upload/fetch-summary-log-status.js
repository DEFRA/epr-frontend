import { summaryLogStatusResponseSchema } from '#domain/summary-logs/loads-schema.js'
import { backend, path } from '#server/common/helpers/backend-client.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'

/**
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
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @param {object} options
 * @param {string} options.backendToken - Bearer token for the backend
 * @returns {Promise<SummaryLogStatusResponse>}
 */
const fetchSummaryLogStatus = async (
  organisationId,
  registrationId,
  summaryLogId,
  { backendToken }
) =>
  backend(backendToken).get(
    path`/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`,
    { parse: tolerantly }
  )

export { fetchSummaryLogStatus }
