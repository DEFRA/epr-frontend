import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Initiates a summary log upload via the backend.
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.redirectUrl
 * @param {string} options.backendToken
 * @returns {Promise<{summaryLogId: string, uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
async function initiateSummaryLogUpload({
  organisationId,
  registrationId,
  redirectUrl,
  backendToken
}) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    body: JSON.stringify({ redirectUrl }),
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { initiateSummaryLogUpload }
