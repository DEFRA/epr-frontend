import fetch from 'node-fetch'

import { config } from '#config/config.js'

/**
 * Submits summary log to EPR Backend
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} summaryLogId
 * @returns {Promise<{status: string, accreditationNumber: string}>}
 */
async function submitSummaryLog(organisationId, registrationId, summaryLogId) {
  const baseUrl = config.get('eprBackendUrl')
  const url = `${baseUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`

  const response = await fetch(url, {
    method: 'POST',
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

export { submitSummaryLog }
