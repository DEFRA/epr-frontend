import { paths } from '#server/paths.js'

import { toCaption } from './caption.js'

/**
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
 * @typedef {{
 *   organisation: string,
 *   registration: string,
 *   accreditation?: string
 * }} RecordPaths
 */

/**
 * The trail down to the registration, which every page below it starts with.
 * @param {{
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationName: string,
 *   paths: RecordPaths
 * }} params
 * @returns {Crumb[]}
 */
export const toRegistrationTrail = ({
  localise,
  localiseUrl,
  organisationName,
  paths: { organisation, registration }
}) => [
  {
    text: localise('registrations:details:allOrganisations'),
    href: localiseUrl(paths.regulators.home)
  },
  {
    text: organisationName,
    href: localiseUrl(organisation)
  },
  {
    text: localise('registrations:details:heading'),
    href: localiseUrl(registration)
  }
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
 *   heading: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationName: string,
 *   registrationNumber?: string | null,
 *   accreditationNumber?: string | null,
 *   paths: RecordPaths & { accreditation: string }
 * }} params
 * @returns {AccreditationChildPage}
 */
export const toAccreditationChildPage = ({
  heading,
  localise,
  localiseUrl,
  organisationName,
  registrationNumber,
  accreditationNumber,
  paths: recordPaths
}) => ({
  breadcrumbs: [
    ...toRegistrationTrail({
      localise,
      localiseUrl,
      organisationName,
      paths: recordPaths
    }),
    {
      text: localise('registrations:details:accreditation:breadcrumb'),
      href: localiseUrl(recordPaths.accreditation)
    },
    { text: heading }
  ],
  caption: toCaption([
    organisationName,
    registrationNumber,
    accreditationNumber
  ]),
  heading,
  pageTitle: accreditationNumber
    ? `${accreditationNumber}: ${heading}`
    : heading
})
