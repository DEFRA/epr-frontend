import { errorCodes } from '#server/common/enums/error-codes.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

/**
 * @import {RegistrationWithAccreditation} from './fetch-registration-and-accreditation.js'
 */

/**
 * Fetches registration and accreditation, throwing 404 if either is missing.
 * @param {{ organisationId: string, registrationId: string, backendToken: string, accreditationId?: string }} params
 * @returns {Promise<Required<RegistrationWithAccreditation>>}
 */
export async function getRequiredRegistrationWithAccreditation({
  organisationId,
  registrationId,
  accreditationId,
  backendToken
}) {
  const { registration, accreditation, organisationData } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      backendToken
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

  return {
    registration,
    accreditation,
    // This path only returns once `accreditation` is confirmed present (and
    // therefore live), so the raw and filtered records are the same object
    // here. We echo it into `rawAccreditation` purely to satisfy the
    // `Required<RegistrationWithAccreditation>` return type.
    rawAccreditation: accreditation,
    organisationData
  }
}
