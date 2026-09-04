import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches available reporting periods for a registration from the backend.
 *
 * Asked nothing further, the calendar answers what the registration owes now:
 * the cadence its current accreditation status implies, for the current year.
 * A caller reading a period that has closed - a regulator opening a
 * registered-only year - names the year and cadence it wants instead, and the
 * calendar then bounds the periods by the registration rather than by an
 * accreditation that may have begun partway through or never at all.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} backendToken
 * @param {{ year?: number, cadence?: CadenceValue }} [asked]
 * @returns {Promise<ReportingPeriodsResponse>}
 */
export async function fetchReportingPeriods(
  organisationId,
  registrationId,
  backendToken,
  asked = {}
) {
  const query = new URLSearchParams()

  if (asked.year !== undefined) {
    query.set('year', String(asked.year))
  }

  if (asked.cadence !== undefined) {
    query.set('cadence', asked.cadence)
  }

  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/calendar`
  const search = query.size > 0 ? `?${query}` : ''

  return fetchJsonFromBackend(`${path}${search}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${backendToken}` }
  })
}

/**
 * @typedef {{ name: string }} ReportSubmitter
 */

/**
 * @typedef {{
 *   id: string,
 *   status: SubmissionStatusValue,
 *   submittedAt: string | null,
 *   submittedBy: ReportSubmitter | null
 * }} ReportListItem
 */

/**
 * @typedef {{
 *   year: number,
 *   period: number,
 *   submissionNumber: number,
 *   startDate: string,
 *   endDate: string,
 *   dueDate: string,
 *   periodStatus: SubmissionStatusValue,
 *   report: ReportListItem | null
 * }} ReportingPeriod
 */

/**
 * @typedef {{
 *   cadence: CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingPeriodsResponse
 */

/**
 * @import { CadenceValue, SubmissionStatusValue } from '../constants.js'
 */
