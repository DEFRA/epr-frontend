import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches summary log status from EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @param {object} [options]
 * @param {string} [options.uploadId] - CDP upload ID for status reconciliation
 * @param {string} options.idToken - JWT ID token for authorization
 * @returns {Promise<{status: string, validation?: object, accreditationNumber?: string, loads?: object}>}
 */
async function fetchSummaryLogStatus(
  organisationId,
  registrationId,
  summaryLogId,
  options = {}
) {
  const { uploadId, idToken } = options

  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
  const query = uploadId ? `?uploadId=${encodeURIComponent(uploadId)}` : ''

  return fetchJsonFromBackend(`${path}${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}

export { fetchSummaryLogStatus }
