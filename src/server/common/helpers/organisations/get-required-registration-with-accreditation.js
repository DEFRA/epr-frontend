import { errorCodes } from '#server/common/enums/error-codes.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditationByNumber } from './fetch-registration-and-accreditation.js'

/**
 * @import {Accreditation, AccreditationApproved} from '#domain/organisations/accreditation.js'
 * @import {UserSession} from '#server/auth/types/session.js'
 * @import {AccreditationKeys} from '#server/reports/helpers/report-paths.js'
 * @import {RegistrationWithAccreditation} from './fetch-registration-and-accreditation.js'
 */

/**
 * @typedef {Accreditation & { accreditationNumber: string }} NumberedAccreditation
 */

/**
 * The registration and its live accreditation for the year, by number, or 404.
 * @param {AccreditationKeys} keys
 * @param {UserSession} credentials
 * @returns {Promise<RegistrationWithAccreditation & { accreditation: AccreditationApproved, rawAccreditation: AccreditationApproved }>}
 */
export async function getRequiredRegistrationWithAccreditationByNumber(
  keys,
  credentials
) {
  const { registration, accreditation, organisationData } =
    await fetchRegistrationAndAccreditationByNumber(
      keys.organisationNumber,
      keys.registrationNumber,
      credentials
    )
  // `accreditation` is present only when it is live, so approved or suspended
  const live = /** @type {AccreditationApproved | undefined} */ (accreditation)

  if (!live || !isForYear(live.validFrom, keys.year)) {
    throw notAccredited(keys)
  }

  return {
    registration,
    accreditation: live,
    rawAccreditation: live,
    organisationData
  }
}

/**
 * The registration and its accreditation for the year whatever its status, by
 * number, or 404. A closed accreditation keeps its ledger and its notes.
 * @param {AccreditationKeys} keys
 * @param {UserSession} credentials
 * @returns {Promise<RegistrationWithAccreditation & { accreditation: NumberedAccreditation }>}
 */
export async function getRequiredRegistrationWithAnyAccreditationByNumber(
  keys,
  credentials
) {
  const { registration, rawAccreditation, organisationData } =
    await fetchRegistrationAndAccreditationByNumber(
      keys.organisationNumber,
      keys.registrationNumber,
      credentials
    )

  if (
    !rawAccreditation?.validFrom ||
    !isForYear(rawAccreditation.validFrom, keys.year)
  ) {
    throw notAccredited(keys)
  }

  return {
    registration,
    // Only approval sets `validFrom`, and the number with it
    accreditation: /** @type {NumberedAccreditation} */ (rawAccreditation),
    organisationData
  }
}

/**
 * @param {string} validFrom
 * @param {string} year
 */
const isForYear = (validFrom, year) =>
  new Date(validFrom).getUTCFullYear() === Number(year)

/**
 * @param {AccreditationKeys} keys
 */
const notAccredited = ({ registrationNumber, year }) =>
  notFound('Not accredited for this year', errorCodes.notAccredited, {
    event: {
      action: loggingEventActions.checkAccreditation,
      reason: `registrationNumber=${registrationNumber} year=${year}`
    }
  })
