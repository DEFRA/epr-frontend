import fetch from 'node-fetch'

import { config } from '#config/config.js'

/**
 * Initiates a summary log upload via the backend.
 * The frontend only uses uploadUrl from the response.
 * @param {Object} options
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
  const baseUrl = config.get('eprBackendUrl')
  const url = `${baseUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirectUrl })
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

export { initiateSummaryLogUpload }
