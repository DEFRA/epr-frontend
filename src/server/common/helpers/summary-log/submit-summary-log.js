import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Submits summary log to EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<{status: string, accreditationNumber: string}>}
 */
async function submitSummaryLog(
  organisationId,
  registrationId,
  summaryLogId,
  idToken
) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`

  return fetchJsonFromBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { submitSummaryLog }
