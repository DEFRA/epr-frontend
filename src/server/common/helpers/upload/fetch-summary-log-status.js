import { summaryLogStatusResponseSchema } from '#domain/summary-logs/loads-schema.js'
import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @import { SummaryLogStatusResponse } from '#server/summary-log/types.js'
 */

/**
 * Fetches summary log status from EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @param {object} [options]
 * @param {string} options.idToken - JWT ID token for authorization
 * @returns {Promise<SummaryLogStatusResponse>}
 */
const fetchSummaryLogStatus = async (
  organisationId,
  registrationId,
  summaryLogId,
  { idToken } = {}
) => {
  const data = await fetchJsonFromBackend(
    `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`,
    { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } }
  )

  return summaryLogStatusResponseSchema.validate(data, { stripUnknown: true })
    .value
}

export { fetchSummaryLogStatus }
