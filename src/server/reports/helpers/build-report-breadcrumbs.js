import { paths } from '#server/paths.js'
import { organisationName } from '#server/registrations/details/helpers/caption.js'

import { CADENCE } from '../constants.js'
import {
  accreditationIdPath,
  organisationIdPath,
  registrationIdPath
} from './report-paths.js'

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
 *   accreditationPath: string | undefined,
 *   year: number | string | undefined,
 *   cadence: CadenceValue | undefined,
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]} empty where no page lists the period
 */
const periodCrumb = ({
  registrationPath,
  accreditationPath,
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

  return accreditationPath
    ? [
        {
          text: localise('registrations:details:accreditation:breadcrumb'),
          href: localiseUrl(accreditationPath)
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
  const ids = {
    organisationId: organisation.id,
    registrationId: registration.id
  }
  const registrationPath = registrationIdPath(ids)
  const { accreditationId } = registration

  return [
    {
      text: localise('registrations:details:allOrganisations'),
      href: localiseUrl(paths.regulators.home)
    },
    {
      text: organisationName(organisation),
      href: localiseUrl(organisationIdPath(ids))
    },
    {
      text: localise('registrations:details:heading'),
      href: localiseUrl(registrationPath)
    },
    ...periodCrumb({
      registrationPath,
      accreditationPath: accreditationId
        ? accreditationIdPath({ ...ids, accreditationId })
        : undefined,
      year,
      cadence,
      localise,
      localiseUrl
    }),
    { text: pageName }
  ]
}
