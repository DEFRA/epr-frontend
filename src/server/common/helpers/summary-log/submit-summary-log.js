import { backend, path } from '#server/common/helpers/backend-client.js'

/**
 * Submits summary log to EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<{status: string, accreditationNumber: string}>}
 */
async function submitSummaryLog(
  organisationId,
  registrationId,
  summaryLogId,
  backendToken
) {
  return backend(backendToken).post(
    path`/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`
  )
}

export { submitSummaryLog }
