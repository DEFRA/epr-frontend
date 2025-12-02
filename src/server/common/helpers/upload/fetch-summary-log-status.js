import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches summary log status from EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @returns {Promise<{status: string, validation?: object}>}
 */
async function fetchSummaryLogStatus(
  organisationId,
  registrationId,
  summaryLogId
) {
  const path = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  return fetchJsonFromBackend(path, { method: 'GET' })
}

export { fetchSummaryLogStatus }
