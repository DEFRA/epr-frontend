import { paths } from '#server/paths.js'
import { CADENCE } from '#server/reports/constants.js'

import { organisationName, toCaption } from '../../helpers/caption.js'
import { toReportRows, toReportsHead } from '../../helpers/report-rows.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
 * @import { ReportsTable } from '../../helpers/report-rows.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{
 *   backUrl: string,
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   pageTitle: string,
 *   reports: ReportsTable
 * }} ReportListViewModel
 */

const NAMESPACE = 'registrations:details:accreditation:reports'

/**
 * Continues the accreditation page's trail, ending on this page unlinked.
 * @param {{
 *   accreditationPath: string,
 *   heading: string,
 *   localise: HapiRequest['t'],
 *   localiseUrl: (path: string) => string,
 *   name: string,
 *   organisation: Organisation,
 *   registration: Registration
 * }} params
 * @returns {Crumb[]}
 */
const toBreadcrumbs = ({
  accreditationPath,
  heading,
  localise,
  localiseUrl,
  name,
  organisation,
  registration
}) => [
  {
    text: localise('registrations:details:allOrganisations'),
    href: localiseUrl(paths.regulators.home)
  },
  { text: name, href: localiseUrl(`/organisations/${organisation.id}`) },
  {
    text: localise('registrations:details:heading'),
    href: localiseUrl(
      `/organisations/${organisation.id}/registrations/${registration.id}`
    )
  },
  {
    text: localise('registrations:details:accreditation:breadcrumb'),
    href: localiseUrl(accreditationPath)
  },
  { text: heading }
]

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
  const name = organisationName(organisation)
  const accreditationPath = `/organisations/${organisation.id}/registrations/${registration.id}/accreditations/${accreditation.id}`
  const heading = localise(`${NAMESPACE}:heading`)

  return {
    backUrl: localiseUrl(accreditationPath),
    breadcrumbs: toBreadcrumbs({
      accreditationPath,
      heading,
      localise,
      localiseUrl,
      name,
      organisation,
      registration
    }),
    caption: toCaption([
      name,
      registration.registrationNumber,
      accreditation.accreditationNumber
    ]),
    heading,
    pageTitle: accreditation.accreditationNumber
      ? `${accreditation.accreditationNumber}: ${heading}`
      : heading,
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
