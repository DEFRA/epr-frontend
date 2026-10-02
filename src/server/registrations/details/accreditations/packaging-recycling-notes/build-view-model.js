import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { toNoteRows } from '#server/prns/helpers/note-rows.js'
import { buildListViewData } from '#server/prns/list-view-data.js'

import { toAccreditationChildPage } from '../../helpers/accreditation-child-page.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
 */

const KEY = 'registrations:details:accreditation:prns'

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
  const { noteTypePlural } = getNoteTypeDisplayNames(registration)
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
    // Regulator pages walk back by breadcrumbs, so the operator's link goes.
    backUrl: null,
    ...toAccreditationChildPage({
      accreditation,
      heading,
      localise,
      localiseUrl,
      organisation,
      registration
    }),
    // Three strings in the operator's set address the person who created the
    // notes, so a regulator gets their own. Everything else is shared.
    cancelHint: null,
    noPrnsCreatedText: localise(`${KEY}:none`, { noteTypePlural }),
    noCancelledText: localise(`${KEY}:noneCancelled`, { noteTypePlural })
  }
}
