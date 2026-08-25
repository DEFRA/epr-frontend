import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource, RegistrationResource } from './types.js'
 */

/**
 * @typedef {{
 *   organisation: Organisation,
 *   registration: RegistrationResource,
 *   accreditations: AccreditationResource[]
 * }} RegistrationDetails
 */

/**
 * @param {string} organisationId
 * @param {string} registrationId
 * @returns {string}
 */
const registrationPath = (organisationId, registrationId) =>
  `/v1/organisations/${organisationId}/registrations/${registrationId}`

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
 * One registration, as the domain holds it. The keys outside `application`
 * are the ones a regulator decided; the ones inside it are the answers the
 * applicant gave on the form.
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
 * Every accreditation the registration holds, an application that never
 * became one included.
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
 * Everything the registration details page reads.
 *
 * The backend models a resource rather than a page, so the page asks for each
 * resource it shows: the registration, the accreditations that registration
 * holds, and the organisation. The registration carries the name the applicant
 * typed on the form, which is not the organisation's name, so the organisation
 * is read for the name the page names it by.
 *
 * The three reads do not depend on one another, so they run together and the
 * page waits once.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<RegistrationDetails>}
 */
export const fetchRegistrationDetails = async (params) => {
  const [organisation, registration, accreditations] = await Promise.all([
    fetchOrganisationById(params.organisationId, params.backendToken),
    fetchRegistration(params),
    fetchAccreditations(params)
  ])

  return { organisation, registration, accreditations }
}
