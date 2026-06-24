import { summaryLogStatusResponseSchema } from '#domain/summary-logs/loads-schema.js'
import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'

/**
 * @import { SummaryLogStatusResponse } from '#server/summary-log/types.js'
 */

/**
 * Fetches summary log status from EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @param {object} options
 * @param {string} options.idToken - JWT ID token for authorization
 * @returns {Promise<SummaryLogStatusResponse>}
 */
const fetchSummaryLogStatus = async (
  organisationId,
  registrationId,
  summaryLogId,
  { idToken }
) => {
  const data = await fetchJsonFromBackend(
    `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`,
    { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } }
  )

  // stripUnknown drops fields outside the schema; we keep the validated value
  // regardless of error so a backend drift degrades gracefully rather than
  // 500ing the page, but we log any violation so the drift is observable.
  const { value, error } = summaryLogStatusResponseSchema.validate(data, {
    stripUnknown: true
  })
  if (error) {
    createLogger().warn({
      message: `Summary log status response failed validation: ${error.message}`
    })
  }
  return value
}

export { fetchSummaryLogStatus }
