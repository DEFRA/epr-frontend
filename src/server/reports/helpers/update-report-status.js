import { reportBackend } from './report-backend.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Transitions a report's status via the backend POST endpoint.
 * @param {SubmissionKeys} keys
 * @param {{
 *   status: string,
 *   submissionDeclaredBy?: string,
 *   version: number
 * }} transition - The target status and report version for optimistic locking
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export const updateReportStatus = (keys, transition, backendToken) =>
  reportBackend(backendToken).post(`${reportApiPath(keys)}/status`, transition)
