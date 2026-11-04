import { toYear } from '#server/common/helpers/year.js'

/**
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { Accreditation, RegistrationView } from './organisation-view.js'
 */

/**
 * Each value of a record keyed by year, with the year it is keyed by.
 * @template T
 * @param {Record<string, T>} byYear
 * @returns {[Year, T][]}
 */
export const yearEntries = (byYear) =>
  Object.entries(byYear).map(([year, value]) => [toYear(Number(year)), value])

/**
 * Each of the registration's accreditations, with the year it is keyed by.
 * @param {RegistrationView['accreditations']} accreditations
 * @returns {[Year, Accreditation][]}
 */
export const accreditationEntries = (accreditations) =>
  yearEntries(accreditations)
