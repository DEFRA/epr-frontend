import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { isAccreditationActive } from '#server/common/helpers/organisations/accreditation-helpers.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * @import {Accreditation} from '#domain/organisations/accreditation.js'
 * @import {Organisation} from '#domain/organisations/model.js'
 * @import {Registration} from '#domain/organisations/registration.js'
 */

/**
 * `accreditation` and `rawAccreditation` are the same linked record seen two
 * ways, and yes, it is a bit awkward to expose both:
 * - `accreditation` is the *filtered* view — present only when the record is
 *   live (approved/suspended, per `isAccreditationActive`). Almost every
 *   consumer wants this, because a non-live accreditation should render as
 *   registered-only (no waste balance, no PRN card, no status tag).
 * - `rawAccreditation` is the *unfiltered* record, whatever its status. It
 *   exists solely because the reapply-for-accreditation link (PAE-1791) must
 *   also react to `cancelled` accreditations, which the filtered view hides.
 *   Prefer `accreditation`; reach for `rawAccreditation` only when you
 *   genuinely need to inspect a non-live status.
 * @typedef {{
 *   organisationData: Organisation,
 *   registration: Registration,
 *   accreditation?: Accreditation,
 *   rawAccreditation?: Accreditation
 * }} RegistrationWithAccreditation
 */

/**
 * Fetches organisation data and extracts the registration and its linked accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID to find
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<RegistrationWithAccreditation>} Organisation data with registration and accreditation
 */
async function fetchRegistrationAndAccreditation(
  organisationId,
  registrationId,
  idToken
) {
  const organisationData = await fetchOrganisationById(organisationId, idToken)

  const registration = organisationData.registrations.find(
    ({ id }) => id === registrationId
  )

  if (!registration) {
    throw notFound('Registration not found', errorCodes.registrationNotFound, {
      event: {
        action: 'fetch_registration',
        reason: `organisationId=${organisationId} registrationId=${registrationId}`
      }
    })
  }

  const rawAccreditation = organisationData.accreditations.find(
    ({ id }) => id === registration.accreditationId
  )

  return {
    organisationData,
    registration,
    // The raw record is returned as-is; `accreditation` below is the same
    // object filtered to live statuses only. See the typedef for the why.
    rawAccreditation,
    accreditation: isAccreditationActive(rawAccreditation)
      ? rawAccreditation
      : undefined
  }
}

export { fetchRegistrationAndAccreditation }
