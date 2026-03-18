import Boom from '@hapi/boom'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

/**
 * @import {RegistrationWithAccreditation} from './fetch-registration-and-accreditation.js'
 * @import {TypedLogger} from '#server/common/helpers/logging/logger.js'
 */

/**
 * Fetches registration and accreditation, throwing 404 if either is missing.
 * @param {{ organisationId: string, registrationId: string, idToken: string, logger: TypedLogger, accreditationId?: string }} params
 * @returns {Promise<Required<RegistrationWithAccreditation>>}
 * @throws {Boom.notFound} When registration or accreditation is not found, or accreditation ID mismatches
 */
export async function getRequiredRegistrationWithAccreditation({
  organisationId,
  registrationId,
  idToken,
  logger,
  accreditationId
}) {
  const { registration, accreditation, organisationData } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      idToken
    )

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
