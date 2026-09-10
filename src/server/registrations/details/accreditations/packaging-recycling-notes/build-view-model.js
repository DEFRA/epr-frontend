import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { toNoteRows } from '#server/prns/helpers/note-rows.js'
import { buildListViewData } from '#server/prns/list-view-data.js'
import { paths } from '#server/paths.js'

import { organisationName, toCaption } from '../../helpers/caption.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 */

const KEY = 'registrations:details:accreditation:prns'

/**
 * Continues the accreditation page's trail, ending on this page unlinked.
 * @param {{
 *   accreditationPath: string,
 *   heading: string,
 *   localise: (key: string, options?: object) => string,
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
 * An accreditation's notes, read-only.
 *
 * The tabs and their four tables come from `buildListViewData`, the operator's
 * own builder, so a note reads identically to either audience. Only the page
 * furniture differs: this page carries a caption, breadcrumbs and a back link
 * to the accreditation, and none of the operator's balance banner, create
 * button or inset copy.
 * @param {{
 *   request: HapiRequest,
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   packagingRecyclingNotes: PackagingRecyclingNote[]
 * }} params
 */
export const buildViewModel = ({
  request,
  organisation,
  registration,
  accreditation,
  packagingRecyclingNotes
}) => {
  const { t: localise, localiseUrl } = request
  const name = organisationName(organisation)
  const { noteTypePlural } = getNoteTypeDisplayNames(registration)
  const accreditationPath = `/organisations/${organisation.id}/registrations/${registration.id}/accreditations/${accreditation.id}`
  const heading = localise(`${KEY}:listHeading`, { noteTypePlural })

  const list = buildListViewData(request, {
    organisationId: organisation.id,
    registrationId: registration.id,
    accreditationId: accreditation.id,
    registration,
    ...toNoteRows(packagingRecyclingNotes)
  })

  return {
    ...list,
    backUrl: localiseUrl(accreditationPath),
    // Three strings in the operator's set address the person who created the
    // notes, so a regulator gets their own. Everything else is shared.
    cancelHint: null,
    noPrnsCreatedText: localise(`${KEY}:none`, { noteTypePlural }),
    noCancelledText: localise(`${KEY}:noneCancelled`, { noteTypePlural }),
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
