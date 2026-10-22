import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import { accreditationIn } from '#server/common/helpers/organisations/registration-in-view.js'
import { CADENCE } from '#server/reports/constants.js'
import { fetchYearCalendar } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { Accreditation, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{
 *   organisation: OrganisationView,
 *   accreditation: Accreditation,
 *   cadence: CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportListDetails
 */

/**
 * What the reports page shows. A failed read fails the page: the periods are
 * all of its content.
 * @param {AccreditationKeys & { backendToken: BackendToken }} params
 * @returns {Promise<ReportListDetails>}
 */
export const fetchReportListDetails = async ({
  backendToken,
  year,
  ...keys
}) => {
  const [{ organisation, registration }, { accredited }] = await Promise.all([
    fetchRegistration({ ...keys, backendToken }),
    fetchYearCalendar({ ...keys, year: Number(year) }, backendToken)
  ])

  return {
    organisation,
    accreditation: accreditationIn(registration, year),
    cadence: CADENCE.MONTHLY,
    reportingPeriods: accredited?.reportingPeriods ?? []
  }
}
