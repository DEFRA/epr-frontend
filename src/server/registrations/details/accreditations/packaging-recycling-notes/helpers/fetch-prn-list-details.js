import { getRequiredRegistrationWithAccreditationByNumber } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { fetchPackagingRecyclingNotes } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'

/**
 * @import { AccreditationApproved } from '#domain/organisations/accreditation.js'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/prn-resource.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationApproved,
 *   packagingRecyclingNotes: PackagingRecyclingNote[]
 * }} PrnListDetails
 */

/**
 * The records and notes the page shows, and no more. A failed read fails the
 * page, the notes being all of its content.
 * @param {{ keys: AccreditationKeys, credentials: UserSession }} params
 * @returns {Promise<PrnListDetails>}
 */
export const fetchPrnListDetails = async ({ keys, credentials }) => {
  const [linked, packagingRecyclingNotes] = await Promise.all([
    getRequiredRegistrationWithAccreditationByNumber(keys, credentials),
    fetchPackagingRecyclingNotes(keys, credentials.backendToken)
  ])

  return {
    organisation: linked.organisationData,
    registration: linked.registration,
    accreditation: linked.accreditation,
    packagingRecyclingNotes
  }
}
