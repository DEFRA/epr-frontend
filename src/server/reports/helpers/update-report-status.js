import { reportBackend, reportPath } from './report-backend.js'

/**
 * @import { ReportAddress } from './report-backend.js'
 */

/**
 * Transitions a report's status via the backend POST endpoint.
 * @param {ReportAddress} periodParams
 * @param {{
 *   status: string,
 *   submissionDeclaredBy?: string,
 *   version: number
 * }} transition - The target status and report version for optimistic locking
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export const updateReportStatus = (periodParams, transition, backendToken) =>
  reportBackend(backendToken).post(
    `${reportPath(periodParams)}/status`,
    transition
  )
