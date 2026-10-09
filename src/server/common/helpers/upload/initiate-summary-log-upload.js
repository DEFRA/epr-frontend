import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * Initiates a summary log upload via the backend, scoped to the year it
 * belongs to. Which accreditation, if any, the upload belongs to isn't asked
 * for here — the backend stamps it at upload-completed from the
 * registration's current accreditation link.
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
  return backend(backendToken).post(
    path`/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${year}`,
    { redirectUrl }
  )
}

export { initiateSummaryLogUpload }
