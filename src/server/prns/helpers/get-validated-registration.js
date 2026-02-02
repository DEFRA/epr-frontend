import Boom from '@hapi/boom'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'

/**
 * Fetch and validate registration with accreditation
 * @param {Request} request
 * @returns {Promise<{registration: object, accreditation: object}>}
 */
export async function getValidatedRegistration(request) {
  const { organisationId, registrationId } = request.params
  const session = request.auth.credentials

  const { registration, accreditation } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

  if (!registration) {
    request.logger.warn({ registrationId }, 'Registration not found')
    throw Boom.notFound('Registration not found')
  }

  if (!accreditation) {
    request.logger.warn(
      { registrationId },
      'Not accredited for this registration'
    )
    throw Boom.notFound('Not accredited for this registration')
  }

  return { registration, accreditation, organisationId, registrationId }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
