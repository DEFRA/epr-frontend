import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { backend, path } from '#server/common/helpers/backend-client.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource } from './types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
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
  path`/v1/organisations/${organisationId}/registrations/${registrationId}`

/**
 * A registration this organisation does not hold is a 404 from the registration
 * route and from its accreditations route alike, and the two race. Either is
 * re-thrown as the same failure, so the log line names what was asked for under
 * the code CDP indexes it by whichever read lost.
 * @param {{ organisationId: string, registrationId: string }} params
 * @returns {(error: unknown) => never}
 */
const asMissingRegistration =
  ({ organisationId, registrationId }) =>
  (error) => {
    if (!Boom.isBoom(error, statusCodes.notFound)) {
      throw error
    }

    throw notFound('Registration not found', errorCodes.registrationNotFound, {
      event: {
        action: 'fetch_registration',
        reason: `organisationId=${organisationId} registrationId=${registrationId}`
      }
    })
  }

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<RegistrationResource>}
 */
const fetchRegistration = (params) =>
  backend(params.backendToken).get(
    registrationPath(params.organisationId, params.registrationId),
    { onError: asMissingRegistration(params) }
  )

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<AccreditationResource[]>}
 */
const fetchAccreditations = async (params) => {
  /** @type {{ accreditations: AccreditationResource[] }} */
  const { accreditations } = await backend(params.backendToken).get(
    `${registrationPath(params.organisationId, params.registrationId)}/accreditations`,
    { onError: asMissingRegistration(params) }
  )

  return accreditations
}

/**
 * The registration carries the name the applicant typed on the form, which is
 * not the organisation's name, so the organisation is read as well for the name
 * the page names it by.
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
