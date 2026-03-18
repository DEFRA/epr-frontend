import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import Boom from '@hapi/boom'

/**
 * @import {Accreditation} from '#domain/organisations/accreditation.js'
 * @import {Organisation} from '#domain/organisations/model.js'
 * @import {Registration} from '#domain/organisations/registration.js'
 */

/**
 * @typedef {{
 *   organisationData: Organisation,
 *   registration: Registration,
 *   accreditation?: Accreditation
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
    throw Boom.notFound('Registration not found')
  }

  const accreditation = organisationData.accreditations.find(
    ({ id }) => id === registration.accreditationId
  )

  return {
    organisationData,
    registration,
    accreditation
  }
}

export { fetchRegistrationAndAccreditation }
