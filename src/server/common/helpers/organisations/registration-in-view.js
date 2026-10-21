import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { registeredYears } from '#server/registrations/details/helpers/timeline-dates.js'
import {
  accreditationPath,
  registeredOnlyPath
} from '#server/reports/helpers/report-paths.js'

import { isAccreditationActive } from './accreditation-helpers.js'

/**
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { Accreditation, OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * @param {{ organisationNumber: string | number, registrationNumber: string }} keys
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
 * @param {string} registrationNumber
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
 * The registration's accreditation for that year.
 * @param {RegistrationView} registration
 * @param {string} year
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
 * @param {number} year
 * @returns {MaterialsHomepage | null}
 */
export const materialsHomepage = (keys, registration, year) => {
  const accreditation = Object.hasOwn(registration.accreditations, year)
    ? registration.accreditations[year]
    : undefined

  if (isAccreditationActive(accreditation)) {
    return {
      kind: 'accredited',
      path: accreditationPath({ ...keys, year: String(year) })
    }
  }

  return registeredYears(registration).includes(year)
    ? { kind: 'registeredOnly', path: registeredOnlyPath({ ...keys, year }) }
    : null
}
