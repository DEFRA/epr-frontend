import { fetchReportBackend } from './fetch-report-backend.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Requests resubmission on an operator's own submitted report via the
 * backend POST endpoint. Throws a plain Boom conflict (409) if the report is
 * no longer eligible — unlike {@link fetchReportBackend}'s other callers,
 * the 409 codes here aren't stale reasons, so they propagate as-is rather
 * than becoming a ReportStaleError.
 * @param {SubmissionKeys} keys
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function requestResubmission(keys, backendToken) {
  return fetchReportBackend(`${reportApiPath(keys)}/request-resubmission`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}
