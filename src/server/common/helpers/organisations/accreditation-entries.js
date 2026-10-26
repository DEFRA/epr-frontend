import { toYear } from '#server/common/helpers/year.js'

/**
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { Accreditation, RegistrationView } from './organisation-view.js'
 */

/**
 * Each of the registration's accreditations, with the year it is keyed by.
 * @param {RegistrationView['accreditations']} accreditations
 * @returns {[Year, Accreditation][]}
 */
export const accreditationEntries = (accreditations) =>
  Object.entries(accreditations).map(([year, accreditation]) => [
    toYear(Number(year)),
    accreditation
  ])
