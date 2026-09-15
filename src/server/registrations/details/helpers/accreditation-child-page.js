import { paths } from '#server/paths.js'

import { organisationName, toCaption } from './caption.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { AccreditationResource, Localise } from './types.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   pageTitle: string
 * }} AccreditationChildPage
 */

/**
 * Continues the accreditation page's trail, ending on this page unlinked.
 * @param {{
 *   accreditationPath: string,
 *   heading: string,
 *   localise: Localise,
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
 * The furniture every page below an accreditation shares.
 * @param {{
 *   accreditation: AccreditationResource,
 *   heading: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisation: Organisation,
 *   registration: Registration
 * }} params
 * @returns {AccreditationChildPage}
 */
export const toAccreditationChildPage = ({
  accreditation,
  heading,
  localise,
  localiseUrl,
  organisation,
  registration
}) => {
  const name = organisationName(organisation)
  const accreditationPath = `/organisations/${organisation.id}/registrations/${registration.id}/accreditations/${accreditation.id}`

  return {
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
      : heading
  }
}
