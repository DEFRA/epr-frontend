import { errorCodes } from '#server/common/enums/error-codes.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

/**
 * @import {RegistrationWithAccreditation} from './fetch-registration-and-accreditation.js'
 */

/**
 * Fetches registration and accreditation, throwing 404 if either is missing.
 * @param {{ organisationId: string, registrationId: string, idToken: string, accreditationId?: string }} params
 * @returns {Promise<Required<RegistrationWithAccreditation>>}
 */
export async function getRequiredRegistrationWithAccreditation({
  organisationId,
  registrationId,
  accreditationId,
  idToken
}) {
  const { registration, accreditation, organisationData } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      idToken
    )

  if (!accreditation) {
    throw notFound(
      'Not accredited for this registration',
      errorCodes.notAccredited,
      {
        event: {
          action: loggingEventActions.checkAccreditation,
          reason: `registrationId=${registrationId}`
        }
      }
    )
  }

  if (accreditation.id !== accreditationId) {
    throw notFound(
      'Accreditation ID mismatch',
      errorCodes.accreditationIdMismatch,
      {
        event: {
          action: loggingEventActions.checkAccreditation,
          reason: `registrationId=${registrationId} accreditationId=${accreditationId}`
        }
      }
    )
  }

  return { registration, accreditation, organisationData }
}
