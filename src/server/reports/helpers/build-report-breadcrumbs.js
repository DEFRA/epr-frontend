import { paths } from '#server/paths.js'
import { organisationName } from '#server/registrations/details/helpers/caption.js'

import { CADENCE } from '../constants.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { CadenceValue } from '../constants.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 */

/**
 * The page that listed the period, which is not the same page for both
 * cadences: monthly periods sit on the accreditation, quarterly ones on the
 * registered-only year. A monthly period with no accreditation has no such
 * page, so the trail stops at the registration above it — as does the reports
 * list, which names no period at all.
 * @param {{
 *   registrationPath: string,
 *   accreditationId: string | undefined,
 *   year: number | string | undefined,
 *   cadence: CadenceValue | undefined,
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]} empty where no page lists the period
 */
const periodCrumb = ({
  registrationPath,
  accreditationId,
  year,
  cadence,
  localise,
  localiseUrl
}) => {
  if (!cadence) {
    return []
  }

  if (cadence === CADENCE.QUARTERLY) {
    return [
      {
        text: localise(
          'registrations:details:registeredOnlyPeriod:breadcrumb',
          {
            year: String(year)
          }
        ),
        href: localiseUrl(`${registrationPath}/registered-only-periods/${year}`)
      }
    ]
  }

  return accreditationId
    ? [
        {
          text: localise('registrations:details:accreditation:breadcrumb'),
          href: localiseUrl(
            `${registrationPath}/accreditations/${accreditationId}`
          )
        }
      ]
    : []
}

/**
 * The trail a regulator walks to reach a report page. An operator gets a back
 * link instead and never calls this.
 * @param {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   pageName: string,
 *   year?: number | string,
 *   cadence?: CadenceValue,
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]}
 */
export const buildReportBreadcrumbs = ({
  organisation,
  registration,
  pageName,
  year,
  cadence,
  localise,
  localiseUrl
}) => {
  const registrationPath = `/organisations/${organisation.id}/registrations/${registration.id}`

  return [
    {
      text: localise('registrations:details:allOrganisations'),
      href: localiseUrl(paths.regulators.home)
    },
    {
      text: organisationName(organisation),
      href: localiseUrl(`/organisations/${organisation.id}`)
    },
    {
      text: localise('registrations:details:heading'),
      href: localiseUrl(registrationPath)
    },
    ...periodCrumb({
      registrationPath,
      accreditationId: registration.accreditationId,
      year,
      cadence,
      localise,
      localiseUrl
    }),
    { text: pageName }
  ]
}
