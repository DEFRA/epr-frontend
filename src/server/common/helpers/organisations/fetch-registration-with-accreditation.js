import { errorCodes } from '#server/common/enums/error-codes.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

import { isAccreditationViewActive } from './accreditation-helpers.js'
import { fetchRegistration } from './fetch-registration.js'
import { latestAccreditationYear } from './registration-in-view.js'

/**
 * @import { AccreditationKeys, RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { AccreditationView, OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * `accreditation` is present only when live (approved or suspended).
 * @typedef {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   accreditation?: AccreditationView
 * }} RegistrationWithAccreditation
 */

/**
 * The registration's latest accreditation, when it is live.
 * @param {RegistrationView} registration
 * @returns {AccreditationView | undefined}
 */
export const liveAccreditationOf = (registration) => {
  const year = latestAccreditationYear(registration)
  const accreditation = year ? registration.accreditations[year] : undefined

  return isAccreditationViewActive(accreditation) ? accreditation : undefined
}

/**
 * The registration by number, with its latest live accreditation.
 * @param {RegistrationKeys} keys
 * @param {string} backendToken
 * @returns {Promise<RegistrationWithAccreditation>}
 */
export const fetchRegistrationWithAccreditation = async (
  keys,
  backendToken
) => {
  const { organisation, registration } = await fetchRegistration({
    ...keys,
    backendToken
  })

  return {
    organisation,
    registration,
    accreditation: liveAccreditationOf(registration)
  }
}

/**
 * The registration and its live accreditation for the year, by number, or 404.
 * @param {AccreditationKeys} keys
 * @param {string} backendToken
 * @returns {Promise<Required<RegistrationWithAccreditation>>}
 */
export const fetchRequiredAccreditation = async (
  { year, ...keys },
  backendToken
) => {
  const { organisation, registration } = await fetchRegistration({
    ...keys,
    backendToken
  })
  const accreditation = registration.accreditations[year]

  if (!isAccreditationViewActive(accreditation)) {
    throw notAccredited(keys.registrationNumber, year)
  }

  return { organisation, registration, accreditation }
}

/**
 * The registration and its accreditation for the year whatever its status, by
 * number, or 404. A closed accreditation keeps its ledger and its notes.
 * @param {AccreditationKeys} keys
 * @param {string} backendToken
 * @returns {Promise<Required<RegistrationWithAccreditation>>}
 */
export const fetchRequiredAnyAccreditation = async (
  { year, ...keys },
  backendToken
) => {
  const { organisation, registration } = await fetchRegistration({
    ...keys,
    backendToken
  })
  const accreditation = registration.accreditations[year]

  if (!accreditation) {
    throw notAccredited(keys.registrationNumber, year)
  }

  return { organisation, registration, accreditation }
}

/**
 * @param {string} registrationNumber
 * @param {string} year
 */
const notAccredited = (registrationNumber, year) =>
  notFound('Not accredited for this year', errorCodes.notAccredited, {
    event: {
      action: loggingEventActions.checkAccreditation,
      reason: `registrationNumber=${registrationNumber} year=${year}`
    }
  })
