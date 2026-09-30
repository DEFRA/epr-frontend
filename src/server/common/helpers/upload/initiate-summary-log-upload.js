import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Initiates a summary log upload via the backend, scoped to the year it
 * belongs to. Which accreditation, if any, the upload belongs to isn't asked
 * for here — the backend resolves that from the file itself when it
 * validates.
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {number} options.year
 * @param {string} options.redirectUrl
 * @param {string} options.backendToken
 * @returns {Promise<{summaryLogId: string, uploadId: string, uploadUrl: string, statusUrl: string}>}
 */
async function initiateSummaryLogUpload({
  organisationId,
  registrationId,
  year,
  redirectUrl,
  backendToken
}) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${year}`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    body: JSON.stringify({ redirectUrl }),
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { initiateSummaryLogUpload }
