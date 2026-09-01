import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
 */

/**
 * @typedef {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   wasteBalance: WasteBalance | null
 * }} AccreditationDetails
 */

/**
 * @param {string} backendToken
 * @returns {RequestInit}
 */
const readAs = (backendToken) => ({
  method: 'GET',
  headers: {
    Authorization: `Bearer ${backendToken}`
  }
})

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
      readAs(backendToken)
    )
  )

/**
 * The page names the organisation, the registration and the accreditation
 * together in its caption, so all three are read. The registration comes off
 * the organisation document rather than its own address: the only thing the
 * caption wants from it is the number, which the stored record carries.
 *
 * The waste balance is a fourth read, from the address the operator's own
 * pages already use. `getWasteBalance` logs a failure and answers null rather
 * than raising, so a balance service that is down costs the page its two
 * balance rows rather than the whole page.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<AccreditationDetails>}
 */
export const fetchAccreditationDetails = async (params) => {
  const [linked, accreditation, wasteBalance] = await Promise.all([
    fetchRegistrationAndAccreditation(
      params.organisationId,
      params.registrationId,
      params.backendToken
    ),
    fetchAccreditation(params),
    getWasteBalance(
      params.organisationId,
      params.accreditationId,
      params.backendToken,
      params.logger
    )
  ])

  return {
    organisation: linked.organisationData,
    registration: linked.registration,
    accreditation,
    wasteBalance
  }
}
