import Boom from '@hapi/boom'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

/**
 * Fetches registration and accreditation, throwing 404 if either is missing.
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID to find
 * @param {string} idToken - JWT ID token for authorization
 * @param {object} logger - Request logger
 * @returns {Promise<{registration: object, accreditation: object}>}
 * @throws {Boom.notFound} When registration or accreditation is not found
 */
export async function getRequiredRegistrationWithAccreditation(
  organisationId,
  registrationId,
  idToken,
  logger
) {
  const { registration, accreditation } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      idToken
    )

  if (!registration) {
    logger.warn({ registrationId }, 'Registration not found')
    throw Boom.notFound('Registration not found')
  }

  if (!accreditation) {
    logger.warn({ registrationId }, 'Not accredited for this registration')
    throw Boom.notFound('Not accredited for this registration')
  }

  return { registration, accreditation }
}
