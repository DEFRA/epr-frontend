import Boom from '@hapi/boom'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

/**
 * Fetches registration and accreditation, throwing 404 if either is missing.
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID to find
 * @param {string} idToken - JWT ID token for authorization
 * @param {object} logger - Request logger
 * @param {string} [accreditationId] - Optional accreditation ID to verify matches
 * @returns {Promise<{registration: object, accreditation: object, organisationData: object}>}
 * @throws {Boom.notFound} When registration or accreditation is not found, or accreditation ID mismatches
 */
export async function getRequiredRegistrationWithAccreditation(
  organisationId,
  registrationId,
  idToken,
  logger,
  accreditationId
) {
  const { registration, accreditation, organisationData } =
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

  if (accreditationId && accreditation.id !== accreditationId) {
    logger.warn(
      { registrationId, accreditationId },
      'Accreditation ID mismatch'
    )
    throw Boom.notFound('Accreditation ID mismatch')
  }

  return { registration, accreditation, organisationData }
}
