import { CADENCE } from '#server/reports/constants.js'

import { toAccreditationChildPage } from '../../helpers/accreditation-child-page.js'
import { toReportRows, toReportsHead } from '../../helpers/report-rows.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationChildPage } from '../../helpers/accreditation-child-page.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
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
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   cadence: CadenceValue,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {ReportListViewModel}
 */
export const buildViewModel = ({
  request,
  organisation,
  registration,
  accreditation,
  cadence,
  reportingPeriods
}) => {
  const { t: localise, localiseUrl } = request
  const heading = localise(`${NAMESPACE}:heading`)

  return {
    ...toAccreditationChildPage({
      accreditation,
      heading,
      localise,
      localiseUrl,
      organisation,
      registration
    }),
    reports: {
      head: toReportsHead({ localise, namespace: NAMESPACE }),
      rows: toReportRows({
        cadence: CADENCE.MONTHLY,
        localise,
        localiseUrl,
        organisationId: organisation.id,
        registrationId: registration.id,
        // Same rule as the accreditation page: quarterly periods are not its.
        reportingPeriods: cadence === CADENCE.MONTHLY ? reportingPeriods : []
      })
    }
  }
}
