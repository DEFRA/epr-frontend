import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Initiates a summary log upload via the backend.
 * @param {Request} request - Hapi request object
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.redirectUrl
 * @returns {Promise<{summaryLogId: string, uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
async function initiateSummaryLogUpload(
  request,
  { organisationId, registrationId, redirectUrl }
) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs`

  return fetchJsonFromBackend(request, path, {
    method: 'POST',
    body: JSON.stringify({ redirectUrl })
  })
}

export { initiateSummaryLogUpload }
