import fetch from 'node-fetch'

import { config } from '~/src/config/config.js'

/**
 * Fetches summary log status from EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @returns {Promise<{status: string, failureReason?: string}>}
 */
async function fetchSummaryLogStatus(
  organisationId,
  registrationId,
  summaryLogId
) {
  const baseUrl = config.get('eprBackendUrl')
  const url = `${baseUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    const error = new Error(
      `Backend returned ${response.status}: ${response.statusText}`
    )
    error.status = response.status
    throw error
  }

  return response.json()
}

export { fetchSummaryLogStatus }
