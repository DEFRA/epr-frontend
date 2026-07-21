import { fetchReportBackend } from './fetch-report-backend.js'

/**
 * Requests resubmission on an operator's own submitted report via the
 * backend POST endpoint. Throws a plain Boom conflict (409) if the report is
 * no longer eligible — unlike {@link fetchReportBackend}'s other callers,
 * the 409 codes here aren't stale reasons, so they propagate as-is rather
 * than becoming a ReportStaleError.
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number, submissionNumber: number }} periodParams
 * @param {string} idToken
 * @returns {Promise<unknown>}
 */
export async function requestResubmission(periodParams, idToken) {
  const {
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber
  } = periodParams
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}/submissions/${submissionNumber}/request-resubmission`

  return fetchReportBackend(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  })
}
