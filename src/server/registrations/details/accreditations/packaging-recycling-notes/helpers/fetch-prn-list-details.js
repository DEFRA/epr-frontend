import { fetchRequiredAnyAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { fetchPackagingRecyclingNotes } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/prn-resource.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   accreditation: AccreditationView,
 *   packagingRecyclingNotes: PackagingRecyclingNote[]
 * }} PrnListDetails
 */

/**
 * The records and notes the page shows, and no more, whatever the
 * accreditation's status. A failed read fails the page, the notes being all of
 * its content.
 * @param {{ keys: AccreditationKeys, credentials: UserSession }} params
 * @returns {Promise<PrnListDetails>}
 */
export const fetchPrnListDetails = async ({ keys, credentials }) => {
  const [records, packagingRecyclingNotes] = await Promise.all([
    fetchRequiredAnyAccreditation(keys, credentials.backendToken),
    fetchPackagingRecyclingNotes(keys, credentials.backendToken)
  ])

  return { ...records, packagingRecyclingNotes }
}
