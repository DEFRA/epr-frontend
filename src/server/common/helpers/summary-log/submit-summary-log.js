import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Submits summary log to EPR Backend
 * @param {Request} request - Hapi request object
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @returns {Promise<{status: string, accreditationNumber: string}>}
 */
async function submitSummaryLog(
  request,
  organisationId,
  registrationId,
  summaryLogId
) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`

  return fetchJsonFromBackend(request, path, { method: 'POST' })
}

export { submitSummaryLog }
