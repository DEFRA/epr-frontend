import { reportBackend, reportPath } from './report-backend.js'

/**
 * Requests resubmission on an operator's own submitted report via the
 * backend POST endpoint. Throws a plain Boom conflict (409) if the report is
 * no longer eligible — unlike {@link reportBackend}'s other callers,
 * the 409 codes here aren't stale reasons, so they propagate as-is rather
 * than becoming a ReportStaleError.
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number, submissionNumber: number }} periodParams
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function requestResubmission(periodParams, backendToken) {
  return reportBackend(backendToken).post(
    `${reportPath(periodParams)}/request-resubmission`
  )
}
