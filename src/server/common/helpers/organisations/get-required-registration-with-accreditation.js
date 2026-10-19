import { errorCodes } from '#server/common/enums/error-codes.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditationByNumber } from './fetch-registration-and-accreditation.js'

/**
 * @import {AccreditationApproved} from '#domain/organisations/accreditation.js'
 * @import {UserSession} from '#server/auth/types/session.js'
 * @import {AccreditationKeys} from '#server/reports/helpers/report-paths.js'
 * @import {RegistrationWithAccreditation} from './fetch-registration-and-accreditation.js'
 */

/**
 * The registration and its live accreditation for the year, by number, or 404.
 * @param {AccreditationKeys} keys
 * @param {UserSession} credentials
 * @returns {Promise<RegistrationWithAccreditation & { accreditation: AccreditationApproved, rawAccreditation: AccreditationApproved }>}
 */
export async function getRequiredRegistrationWithAccreditationByNumber(
  { organisationNumber, registrationNumber, year },
  credentials
) {
  const { registration, accreditation, organisationData } =
    await fetchRegistrationAndAccreditationByNumber(
      organisationNumber,
      registrationNumber,
      credentials
    )
  // `accreditation` is present only when it is live, so approved or suspended
  const live = /** @type {AccreditationApproved | undefined} */ (accreditation)

  if (!live || new Date(live.validFrom).getUTCFullYear() !== Number(year)) {
    throw notFound('Not accredited for this year', errorCodes.notAccredited, {
      event: {
        action: loggingEventActions.checkAccreditation,
        reason: `registrationNumber=${registrationNumber} year=${year}`
      }
    })
  }

  return {
    registration,
    accreditation: live,
    rawAccreditation: live,
    organisationData
  }
}
