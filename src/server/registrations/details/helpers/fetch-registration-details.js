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
 * @param {string} path
 * @param {string} backendToken
 * @returns {Promise<object>}
 */
const get = (path, backendToken) =>
  fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })

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
export const fetchRegistrationDetails = async ({
  organisationId,
  registrationId,
  backendToken
}) => {
  const registrationPath = `/v1/organisations/${organisationId}/registrations/${registrationId}`

  const [organisation, registration, accreditations] = await Promise.all([
    fetchOrganisationById(organisationId, backendToken),
    /** @type {Promise<RegistrationResource>} */ (
      get(registrationPath, backendToken)
    ),
    /** @type {Promise<{ accreditations: AccreditationResource[] }>} */ (
      get(`${registrationPath}/accreditations`, backendToken)
    )
  ])

  return {
    organisation,
    registration,
    accreditations: accreditations.accreditations
  }
}
