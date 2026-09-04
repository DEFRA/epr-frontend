import { paths } from '#server/paths.js'

import { registeredOnlyStretches } from '../helpers/registered-only.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource, Localise } from '../helpers/types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   hasData: boolean,
 *   heading: string,
 *   pageTitle: string
 * }} RegisteredOnlyPeriodViewModel
 */

/**
 * An organisation trading under another name is known by it, so that is the
 * name the regulator is shown. Matches the two pages above.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The records the page sits under, in the order the breadcrumbs walk them. A
 * record holding no number has nothing to name it by, so it is left out rather
 * than shown as an empty gap between two dashes.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
const toCaption = (parts) => parts.filter(Boolean).join(' - ')

/**
 * @param {{
 *   organisation: Organisation,
 *   registration: RegistrationResource,
 *   accreditations: AccreditationResource[],
 *   year: number,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegisteredOnlyPeriodViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  accreditations,
  year,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const registrationPath = `/organisations/${organisation.id}/registrations/${registration.id}`
  const heading = localise(
    'registrations:details:registeredOnlyPeriod:heading',
    {
      year: String(year)
    }
  )

  return {
    breadcrumbs: [
      {
        text: localise('registrations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      { text: name, href: localiseUrl(`/organisations/${organisation.id}`) },
      {
        text: localise('registrations:details:heading'),
        href: localiseUrl(registrationPath)
      },
      {
        text: localise(
          'registrations:details:registeredOnlyPeriod:breadcrumb',
          { year: String(year) }
        )
      }
    ],
    caption: toCaption([name, registration.registrationNumber]),
    // A year holding no registered-only time is the page's whole subject, so
    // the answer is carried rather than the stretches that produced it.
    hasData:
      registeredOnlyStretches({
        dateRange: registration.dateRange,
        accreditations,
        year
      }).length > 0,
    heading,
    // The year already identifies this page, so unlike its two siblings it
    // does not prefix a record number - that would put two identifiers in
    // front of a two-word noun.
    pageTitle: heading
  }
}
