import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource, RegistrationResource } from './types.js'
 */

/**
 * `accreditationId` names the accreditation the registration is on, and
 * `isAccredited` says whether that accreditation is live. A cancelled one is
 * still the accreditation the registration's records are filed under, so the
 * two answer different questions.
 * @typedef {{
 *   organisation: Organisation,
 *   registration: RegistrationResource,
 *   accreditations: AccreditationResource[],
 *   accreditationId: string | undefined,
 *   isAccredited: boolean
 * }} RegistrationDetails
 */

/**
 * @param {string} organisationId
 * @param {string} registrationId
 * @returns {string}
 */
const registrationPath = (organisationId, registrationId) =>
  `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}`

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
 *   backendToken: string
 * }} params
 * @returns {Promise<RegistrationResource>}
 */
const fetchRegistration = ({ organisationId, registrationId, backendToken }) =>
  /** @type {Promise<RegistrationResource>} */ (
    fetchJsonFromBackend(
      registrationPath(organisationId, registrationId),
      readAs(backendToken)
    )
  )

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<AccreditationResource[]>}
 */
const fetchAccreditations = async ({
  organisationId,
  registrationId,
  backendToken
}) => {
  const { accreditations } =
    /** @type {{ accreditations: AccreditationResource[] }} */ (
      await fetchJsonFromBackend(
        `${registrationPath(organisationId, registrationId)}/accreditations`,
        readAs(backendToken)
      )
    )

  return accreditations
}

/**
 * The registration carries the name the applicant typed on the form, which is
 * not the organisation's name, so the organisation is read as well for the name
 * the page names it by, and for the accreditation the registration is on.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<RegistrationDetails>}
 */
export const fetchRegistrationDetails = async (params) => {
  const [linked, registration, accreditations] = await Promise.all([
    fetchRegistrationAndAccreditation(
      params.organisationId,
      params.registrationId,
      params.backendToken
    ),
    fetchRegistration(params),
    fetchAccreditations(params)
  ])

  return {
    organisation: linked.organisationData,
    registration,
    accreditations,
    accreditationId: linked.registration.accreditationId,
    isAccredited: !!linked.accreditation
  }
}
