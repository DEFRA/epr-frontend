import { paths } from '#server/paths.js'

import { CADENCE } from '../constants.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath
} from './report-paths.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { CadenceValue } from '../constants.js'
 * @import { RegistrationKeys } from './report-paths.js'
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
 *   registrationUrl: string,
 *   accreditationUrl: string | undefined,
 *   year: number | string | undefined,
 *   cadence: CadenceValue | undefined,
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]} empty where no page lists the period
 */
const periodCrumb = ({
  registrationUrl,
  accreditationUrl,
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
        href: localiseUrl(`${registrationUrl}/registered-only-periods/${year}`)
      }
    ]
  }

  return accreditationUrl
    ? [
        {
          text: localise('registrations:details:accreditation:breadcrumb'),
          href: localiseUrl(accreditationUrl)
        }
      ]
    : []
}

/**
 * The trail a regulator walks to reach a report page. An operator gets a back
 * link instead and never calls this.
 * @param {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   keys: RegistrationKeys,
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
  keys,
  pageName,
  year,
  cadence,
  localise,
  localiseUrl
}) => {
  const registrationUrl = registrationPath(keys)
  const listedOnAccreditation = Object.hasOwn(
    registration.accreditations,
    String(year)
  )

  return [
    {
      text: localise('registrations:details:allOrganisations'),
      href: localiseUrl(paths.regulators.home)
    },
    {
      text: organisation.displayName,
      href: localiseUrl(organisationPath(keys))
    },
    {
      text: localise('registrations:details:heading'),
      href: localiseUrl(registrationUrl)
    },
    ...periodCrumb({
      registrationUrl,
      accreditationUrl: listedOnAccreditation
        ? accreditationPath({ ...keys, year: String(year) })
        : undefined,
      year,
      cadence,
      localise,
      localiseUrl
    }),
    { text: pageName }
  ]
}
