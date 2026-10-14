import { CADENCE } from '#server/reports/constants.js'
import {
  accreditationPath,
  registrationPath,
  reportPath
} from '#server/reports/helpers/report-paths.js'

import { toAccreditationChildPage } from '../../helpers/accreditation-child-page.js'
import { organisationViewName } from '../../helpers/caption.js'
import { toReportRows, toReportsHead } from '../../helpers/report-rows.js'

/**
 * @import { AccreditationView, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { AccreditationChildPage } from '../../helpers/accreditation-child-page.js'
 * @import { ReportsTable } from '../../helpers/report-rows.js'
 */

/**
 * @typedef {AccreditationChildPage & { reports: ReportsTable }} ReportListViewModel
 */

const NAMESPACE = 'registrations:details:accreditation:reports'

/**
 * Every reporting period an accreditation owes, where its own page shows the
 * three most recent.
 * @param {{
 *   request: HapiRequest,
 *   keys: AccreditationKeys,
 *   organisation: OrganisationView,
 *   accreditation: AccreditationView,
 *   cadence: CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {ReportListViewModel}
 */
export const buildViewModel = ({
  request,
  keys,
  organisation,
  accreditation,
  cadence,
  reportingPeriods
}) => {
  const { t: localise, localiseUrl } = request
  const heading = localise(`${NAMESPACE}:heading`)

  return {
    ...toAccreditationChildPage({
      heading,
      localise,
      localiseUrl,
      organisationName: organisationViewName(organisation),
      registrationNumber: keys.registrationNumber,
      accreditationNumber: accreditation.accreditationNumber,
      paths: {
        organisation: `/organisations/${encodeURIComponent(keys.organisationNumber)}`,
        registration: registrationPath(keys),
        accreditation: accreditationPath(keys)
      }
    }),
    reports: {
      head: toReportsHead({ localise, namespace: NAMESPACE }),
      rows: toReportRows({
        cadence: CADENCE.MONTHLY,
        localise,
        localiseUrl,
        periodPath: (period) =>
          reportPath({
            organisationNumber: keys.organisationNumber,
            registrationNumber: keys.registrationNumber,
            year: period.year,
            cadence: CADENCE.MONTHLY,
            period: period.period,
            submissionNumber: period.submissionNumber
          }),
        // Same rule as the accreditation page: quarterly periods are not its.
        reportingPeriods: cadence === CADENCE.MONTHLY ? reportingPeriods : []
      })
    }
  }
}
