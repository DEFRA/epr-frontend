import { reportBackend, reportPath } from './report-backend.js'

/**
 * Transitions a report's status via the backend POST endpoint.
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number, submissionNumber: number }} periodParams
 * @param {{ status: string, version: number, submissionDeclaredBy?: string }} transition - The target status and report version for optimistic locking
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function updateReportStatus(
  periodParams,
  transition,
  backendToken
) {
  return reportBackend(backendToken).post(
    `${reportPath(periodParams)}/status`,
    transition
  )
}
