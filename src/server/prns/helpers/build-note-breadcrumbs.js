import { paths } from '#server/paths.js'
import { organisationName } from '#server/registrations/details/helpers/caption.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
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
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditationId: string,
 *   noteTypePlural: string,
 *   prn: { id: string, prnNumber?: string | null },
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]}
 */
export const buildNoteBreadcrumbs = ({
  organisation,
  registration,
  accreditationId,
  noteTypePlural,
  prn,
  localise,
  localiseUrl
}) => {
  const registrationPath = `/organisations/${organisation.id}/registrations/${registration.id}`
  const accreditationPath = `${registrationPath}/accreditations/${accreditationId}`

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
    {
      text: localise('registrations:details:accreditation:breadcrumb'),
      href: localiseUrl(accreditationPath)
    },
    {
      text: localise('registrations:details:accreditation:prns:listHeading', {
        noteTypePlural
      }),
      href: localiseUrl(`${accreditationPath}/packaging-recycling-notes`)
    },
    { text: prn.prnNumber ?? prn.id }
  ]
}
