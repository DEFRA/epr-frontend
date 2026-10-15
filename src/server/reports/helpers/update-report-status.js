import { fetchReportBackend } from './fetch-report-backend.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Transitions a report's status via the backend POST endpoint.
 * @param {SubmissionKeys} keys
 * @param {{ status: string, version: number, submissionDeclaredBy?: string }} transition - The target status and report version for optimistic locking
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function updateReportStatus(keys, transition, backendToken) {
  return fetchReportBackend(`${reportApiPath(keys)}/status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`
    },
    body: JSON.stringify(transition)
  })
}
