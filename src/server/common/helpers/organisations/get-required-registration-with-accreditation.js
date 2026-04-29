import { errorCodes } from '#server/common/enums/error-codes.js'
import { LOGGING_EVENT_ACTIONS } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

/**
 * @import {RegistrationWithAccreditation} from './fetch-registration-and-accreditation.js'
 * @import {TypedLogger} from '#server/common/helpers/logging/logger.js'
 */

/**
 * Fetches registration and accreditation, throwing 404 if either is missing.
 * @param {{ organisationId: string, registrationId: string, idToken: string, logger: TypedLogger, accreditationId?: string }} params
 * @returns {Promise<Required<RegistrationWithAccreditation>>}
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
    throw notFound(
      'Not accredited for this registration',
      errorCodes.notAccredited,
      {
        event: {
          action: LOGGING_EVENT_ACTIONS.CHECK_ACCREDITATION,
          reason: `registrationId=${registrationId}`
        }
      }
    )
  }

  if (accreditation.id !== accreditationId) {
    logger.warn({
      message: 'Accreditation ID mismatch',
      event: {
        action: LOGGING_EVENT_ACTIONS.CHECK_ACCREDITATION,
        reason: `registrationId=${registrationId} accreditationId=${accreditationId}`
      }
    })
    throw notFound(
      'Accreditation ID mismatch',
      errorCodes.accreditationIdMismatch,
      {
        event: {
          action: LOGGING_EVENT_ACTIONS.CHECK_ACCREDITATION,
          reason: `registrationId=${registrationId} accreditationId=${accreditationId}`
        }
      }
    )
  }

  return { registration, accreditation, organisationData }
}
