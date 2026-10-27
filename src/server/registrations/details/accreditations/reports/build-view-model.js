import { CADENCE } from '#server/reports/constants.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath,
  reportPath
} from '#server/reports/helpers/report-paths.js'

import { toAccreditationChildPage } from '../../helpers/accreditation-child-page.js'
import { toReportRows, toReportsHead } from '../../helpers/report-rows.js'

/**
 * @import { Accreditation, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
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
 *   accreditation: Accreditation,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {ReportListViewModel}
 */
export const buildViewModel = ({
  request,
  keys,
  organisation,
  accreditation,
  reportingPeriods
}) => {
  const { t: localise, localiseUrl } = request
  const heading = localise(`${NAMESPACE}:yearHeading`, { year: keys.year })

  return {
    ...toAccreditationChildPage({
      heading,
      localise,
      localiseUrl,
      organisationName: organisation.displayName,
      registrationNumber: keys.registrationNumber,
      accreditationNumber: accreditation.accreditationNumber,
      paths: {
        organisation: organisationPath(keys),
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
        reportingPeriods
      })
    }
  }
}
