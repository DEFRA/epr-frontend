import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { AccreditationView, OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * The organisation's registration with that number.
 * @param {OrganisationView} organisation
 * @param {string} registrationNumber
 * @returns {RegistrationView}
 */
export const registrationIn = (organisation, registrationNumber) => {
  if (!Object.hasOwn(organisation.registrations, registrationNumber)) {
    throw notFound('Registration not found', errorCodes.registrationNotFound, {
      event: {
        action: 'fetch_registration',
        reason: `organisationNumber=${organisation.organisationNumber} registrationNumber=${registrationNumber}`
      }
    })
  }

  return organisation.registrations[registrationNumber]
}

/**
 * The registration's accreditation for that year.
 * @param {RegistrationView} registration
 * @param {string} year
 * @returns {AccreditationView}
 */
export const accreditationIn = (registration, year) => {
  if (!Object.hasOwn(registration.accreditations, year)) {
    throw notFound(
      'Accreditation not found',
      errorCodes.accreditationNotFound,
      {
        event: { action: 'fetch_accreditation', reason: `year=${year}` }
      }
    )
  }

  return registration.accreditations[year]
}

/**
 * The most recent year the registration holds an accreditation for.
 * @param {RegistrationView} registration
 * @returns {string | undefined}
 */
export const latestAccreditationYear = (registration) =>
  Object.keys(registration.accreditations).sort().at(-1)
