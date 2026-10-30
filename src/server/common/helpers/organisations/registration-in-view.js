import { LEDGER_KINDS } from '#domain/ledger-kinds.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { currentYear } from '#server/common/helpers/year.js'
import { registeredYears } from '#server/registrations/details/helpers/timeline-dates.js'
import {
  accreditationPath,
  registeredOnlyPath
} from '#server/reports/helpers/report-paths.js'

import { isAccreditationActive } from './accreditation-helpers.js'

/**
 * @import { LedgerKind } from '#domain/ledger-kinds.js'
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { AccreditationKeys, RegistrationKeys } from '#server/reports/helpers/report-paths.js'
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
 * @typedef {{ kind: LedgerKind, path: string }} MaterialsHomepage
 */

/** @type {Record<LedgerKind, (keys: AccreditationKeys) => string>} */
const homepagePaths = {
  [LEDGER_KINDS.ACCREDITED]: accreditationPath,
  [LEDGER_KINDS.REGISTERED_ONLY]: registeredOnlyPath
}

/**
 * @param {RegistrationKeys} keys
 * @param {{ year: Year, kind: LedgerKind }} homepage
 * @returns {string}
 */
export const materialsHomepagePath = (keys, { year, kind }) =>
  homepagePaths[kind]({ ...keys, year })

/**
 * @param {RegistrationKeys} keys
 * @param {Year} year
 * @param {LedgerKind} kind
 * @returns {MaterialsHomepage}
 */
const homepageFor = (keys, year, kind) => ({
  kind,
  path: materialsHomepagePath(keys, { year, kind })
})

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
    return homepageFor(keys, year, LEDGER_KINDS.ACCREDITED)
  }

  return registeredYears(registration).includes(year)
    ? homepageFor(keys, year, LEDGER_KINDS.REGISTERED_ONLY)
    : null
}

/**
 * The materials homepage for the latest registered year, or the current
 * year's registered-only address for a registration never registered.
 * @param {RegistrationKeys} keys
 * @param {RegistrationView} registration
 * @returns {string}
 */
export const defaultMaterialsHomepagePath = (keys, registration) => {
  const [latestYear] = registeredYears(registration)
  const homepage = latestYear
    ? materialsHomepage(keys, registration, latestYear)
    : null

  return homepage?.path ?? registeredOnlyPath({ ...keys, year: currentYear() })
}
