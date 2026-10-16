import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import { accreditationIn } from '#server/common/helpers/organisations/registration-in-view.js'
import { fetchReportingPeriodsByNumber } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { AccreditationView, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{
 *   organisation: OrganisationView,
 *   accreditation: AccreditationView,
 *   cadence: CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportListDetails
 */

/**
 * What the reports page shows. A failed read fails the page: the periods are
 * all of its content.
 * @param {AccreditationKeys & { backendToken: string }} params
 * @returns {Promise<ReportListDetails>}
 */
export const fetchReportListDetails = async ({
  backendToken,
  year,
  ...keys
}) => {
  const [{ organisation, registration }, calendar] = await Promise.all([
    fetchRegistration({ ...keys, backendToken }),
    fetchReportingPeriodsByNumber(keys, backendToken)
  ])

  return {
    organisation,
    accreditation: accreditationIn(registration, year),
    cadence: calendar.cadence,
    reportingPeriods: calendar.reportingPeriods
  }
}
