import Boom from '@hapi/boom'
import { LOGGING_EVENT_ACTIONS } from '#server/common/enums/event.js'
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
  accreditationId,
  idToken,
  logger
}) {
  const { registration, accreditation, organisationData } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      idToken
    )

  if (!accreditation) {
    logger.warn({
      message: 'Not accredited for this registration',
      event: {
        action: LOGGING_EVENT_ACTIONS.CHECK_ACCREDITATION,
        reason: `registrationId=${registrationId}`
      }
    })
    throw Boom.notFound('Not accredited for this registration')
  }

  if (accreditation.id !== accreditationId) {
    logger.warn({
      message: 'Accreditation ID mismatch',
      event: {
        action: LOGGING_EVENT_ACTIONS.CHECK_ACCREDITATION,
        reason: `registrationId=${registrationId} accreditationId=${accreditationId}`
      }
    })
    throw Boom.notFound('Accreditation ID mismatch')
  }

  return { registration, accreditation, organisationData }
}
