import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchPackagingRecyclingNotes } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { AccreditationResource } from '../../../helpers/types.js'
 */

/**
 * @typedef {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   packagingRecyclingNotes: PackagingRecyclingNote[]
 * }} PrnListDetails
 */

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<AccreditationResource>}
 */
const fetchAccreditation = ({
  organisationId,
  registrationId,
  accreditationId,
  backendToken
}) =>
  /** @type {Promise<AccreditationResource>} */ (
    fetchJsonFromBackend(
      `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
    )
  )

/**
 * What the notes page reads, and no more.
 *
 * `fetchAccreditationDetails`, which serves the page above this one, would
 * answer all of this — and the waste balance, the reporting calendar and the
 * whole ledger with it, none of which this page draws. Its sibling
 * `getRequiredRegistrationWithAccreditation`, which the operator's own notes
 * list uses, answers no organisation, and the caption names one. So this reads
 * the three things the page shows and stops there.
 *
 * A failed read fails the page: unlike the summary section on the
 * accreditation page, the notes are the whole of this page's content.
 *
 * `fetchPackagingRecyclingNotes` takes its arguments positionally.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<PrnListDetails>}
 */
export const fetchPrnListDetails = async (params) => {
  const [linked, accreditation, packagingRecyclingNotes] = await Promise.all([
    fetchRegistrationAndAccreditation(
      params.organisationId,
      params.registrationId,
      params.backendToken
    ),
    fetchAccreditation(params),
    fetchPackagingRecyclingNotes(
      params.organisationId,
      params.registrationId,
      params.accreditationId,
      params.backendToken
    )
  ])

  return {
    organisation: linked.organisationData,
    registration: linked.registration,
    accreditation,
    packagingRecyclingNotes
  }
}
