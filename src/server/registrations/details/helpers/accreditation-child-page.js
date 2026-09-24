import { paths } from '#server/paths.js'

import { organisationName, toCaption } from './caption.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { Localise } from './types.js'
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
 * The trail down to the registration, which every page below it starts with.
 * @param {{
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisation: Organisation,
 *   registration: Registration
 * }} params
 * @returns {Crumb[]}
 */
export const toRegistrationTrail = ({
  localise,
  localiseUrl,
  organisation,
  registration
}) => [
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
    href: localiseUrl(
      `/organisations/${organisation.id}/registrations/${registration.id}`
    )
  }
]

/**
 * Continues the accreditation page's trail, ending on this page unlinked.
 * @param {{
 *   accreditationPath: string,
 *   heading: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
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
  organisation,
  registration
}) => [
  ...toRegistrationTrail({ localise, localiseUrl, organisation, registration }),
  {
    text: localise('registrations:details:accreditation:breadcrumb'),
    href: localiseUrl(accreditationPath)
  },
  { text: heading }
]

/**
 * @param {{
 *   accreditationId: string,
 *   organisationId: string,
 *   registrationId: string
 * }} params
 * @returns {string}
 */
export const toAccreditationPath = ({
  accreditationId,
  organisationId,
  registrationId
}) =>
  `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`

/**
 * The furniture every page below an accreditation shares.
 * @param {{
 *   accreditation: { id: string, accreditationNumber?: string | null },
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
  return {
    breadcrumbs: toBreadcrumbs({
      accreditationPath: toAccreditationPath({
        accreditationId: accreditation.id,
        organisationId: organisation.id,
        registrationId: registration.id
      }),
      heading,
      localise,
      localiseUrl,
      organisation,
      registration
    }),
    caption: toCaption([
      organisationName(organisation),
      registration.registrationNumber,
      accreditation.accreditationNumber
    ]),
    heading,
    pageTitle: accreditation.accreditationNumber
      ? `${accreditation.accreditationNumber}: ${heading}`
      : heading
  }
}
