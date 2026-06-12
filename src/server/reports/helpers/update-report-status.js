import { fetchReportBackend } from './fetch-report-backend.js'

/**
 * Transitions a report's status via the backend POST endpoint.
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number, submissionNumber: number }} periodParams
 * @param {{ status: string, version: number }} transition - The target status and report version for optimistic locking
 * @param {string} idToken
 * @returns {Promise<unknown>}
 */
export async function updateReportStatus(periodParams, transition, idToken) {
  const {
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber
  } = periodParams
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}/submissions/${submissionNumber}/status`

  return fetchReportBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(transition)
  })
}
