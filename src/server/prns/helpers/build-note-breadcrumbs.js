import { paths } from '#server/paths.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'
import { prnsPath } from './prn-resource.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 */

/**
 * The trail a regulator walks to reach a note. An operator gets a back link
 * and a return link instead, and never calls this.
 *
 * The first five crumbs are the notes list's own trail
 * (`registrations/details/accreditations/packaging-recycling-notes/build-view-model.js`),
 * with its last crumb linked so the list stays reachable from a note. The
 * address it points at serves a regulator their own list, not the operator's.
 * @param {{
 *   organisation: OrganisationView,
 *   keys: AccreditationKeys,
 *   noteTypePlural: string,
 *   prn: { id: string, prnNumber?: string | null },
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]}
 */
export const buildNoteBreadcrumbs = ({
  organisation,
  keys,
  noteTypePlural,
  prn,
  localise,
  localiseUrl
}) => [
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
    href: localiseUrl(registrationPath(keys))
  },
  {
    text: localise('registrations:details:accreditation:breadcrumb'),
    href: localiseUrl(accreditationPath(keys))
  },
  {
    text: localise('registrations:details:accreditation:prns:listHeading', {
      noteTypePlural
    }),
    href: localiseUrl(prnsPath(keys))
  },
  { text: prn.prnNumber ?? prn.id }
]
