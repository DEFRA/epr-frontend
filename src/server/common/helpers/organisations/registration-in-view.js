import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { registeredYears } from '#server/registrations/details/helpers/timeline-dates.js'
import {
  accreditationPath,
  registeredOnlyPath
} from '#server/reports/helpers/report-paths.js'

import { isAccreditationActive } from './accreditation-helpers.js'

/**
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { Accreditation, OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * @param {RegistrationKeys} keys
 */
export const registrationNotFound = ({
  organisationNumber,
  registrationNumber
}) =>
  notFound('Registration not found', errorCodes.registrationNotFound, {
    event: {
      action: 'fetch_registration',
      reason: `organisationNumber=${organisationNumber} registrationNumber=${registrationNumber}`
    }
  })

/**
 * The organisation's registration with that number.
 * @param {OrganisationView} organisation
 * @param {RegistrationNumber} registrationNumber
 * @returns {RegistrationView}
 */
export const registrationIn = (organisation, registrationNumber) => {
  if (!Object.hasOwn(organisation.registrations, registrationNumber)) {
    throw registrationNotFound({
      organisationNumber: organisation.organisationNumber,
      registrationNumber
    })
  }

  return organisation.registrations[registrationNumber]
}

/**
 * Each of the registrations, with the number it is keyed by.
 * @param {OrganisationView['registrations']} registrations
 * @returns {[RegistrationNumber, RegistrationView][]}
 */
export const registrationEntries = (registrations) =>
  Object.entries(registrations).map(([number, registration]) => [
    toRegistrationNumber(number),
    registration
  ])

/**
 * The registration's accreditation for that year.
 * @param {RegistrationView} registration
 * @param {Year} year
 * @returns {Accreditation}
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
 * @typedef {{ kind: 'accredited' | 'registeredOnly', path: string }} MaterialsHomepage
 */

/**
 * @param {RegistrationKeys} keys
 * @param {RegistrationView} registration
 * @param {Year} year
 * @returns {MaterialsHomepage | null}
 */
export const materialsHomepage = (keys, registration, year) => {
  const accreditation = Object.hasOwn(registration.accreditations, year)
    ? registration.accreditations[year]
    : undefined

  if (isAccreditationActive(accreditation)) {
    return {
      kind: 'accredited',
      path: accreditationPath({ ...keys, year })
    }
  }

  return registeredYears(registration).includes(year)
    ? { kind: 'registeredOnly', path: registeredOnlyPath({ ...keys, year }) }
    : null
}
