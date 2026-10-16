import { reportBackend } from './report-backend.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Requests resubmission on an operator's own submitted report via the
 * backend POST endpoint. Throws a plain Boom conflict (409) if the report is
 * no longer eligible — unlike {@link reportBackend}'s other callers,
 * the 409 codes here aren't stale reasons, so they propagate as-is rather
 * than becoming a ReportStaleError.
 * @param {SubmissionKeys} keys
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export const requestResubmission = (keys, backendToken) =>
  reportBackend(backendToken).post(
    `${reportApiPath(keys)}/request-resubmission`
  )
