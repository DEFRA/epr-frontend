import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Initiates a summary log upload via the backend.
 * The frontend only uses uploadUrl from the response.
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.redirectUrl
 * @returns {Promise<{uploadUrl: string}>}
 */
async function initiateSummaryLogUpload({
  organisationId,
  registrationId,
  redirectUrl
}) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    body: JSON.stringify({ redirectUrl })
  })
}

export { initiateSummaryLogUpload }
