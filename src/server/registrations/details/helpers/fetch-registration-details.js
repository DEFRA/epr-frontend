import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
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
 * A registration this organisation does not hold is a 404 from the route
 * itself. It is re-thrown so the log line names what was asked for under the
 * code CDP indexes this failure by, rather than carrying the backend's own.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<RegistrationResource>}
 */
const fetchRegistration = async ({
  organisationId,
  registrationId,
  backendToken
}) => {
  try {
    return /** @type {RegistrationResource} */ (
      await fetchJsonFromBackend(
        registrationPath(organisationId, registrationId),
        readAs(backendToken)
      )
    )
  } catch (error) {
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
}

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
