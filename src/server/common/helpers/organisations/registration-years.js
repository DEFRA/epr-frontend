import { STANDING } from '#domain/registration.js'
import {
  dayBefore,
  toCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { toYear } from '#server/common/helpers/year.js'

/**
 * @import { Standing } from '#domain/registration.js'
 * @import { Accreditation, RegistrationView } from './organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { DateRange } from './registration-resource.js'
 */

/**
 * Which standings a check counts. Keyed by every standing, so a standing the
 * backend adds must be classified here before this compiles.
 * @typedef {Readonly<Record<Standing, boolean>>} StandingCheck
 */

/** @type {StandingCheck} */
export const REGISTERED = Object.freeze({
  [STANDING.REGISTERED_ONLY]: true,
  [STANDING.ACCREDITED]: true,
  [STANDING.CANCELLED]: false
})

/** @type {StandingCheck} */
export const REGISTERED_ONLY = Object.freeze({
  [STANDING.REGISTERED_ONLY]: true,
  [STANDING.ACCREDITED]: false,
  [STANDING.CANCELLED]: false
})

/** @type {StandingCheck} */
const ACCREDITED = Object.freeze({
  [STANDING.REGISTERED_ONLY]: false,
  [STANDING.ACCREDITED]: true,
  [STANDING.CANCELLED]: false
})

/**
 * @template T
 * @param {Record<string, T>} byYear
 * @returns {[Year, T][]}
 */
const yearEntries = (byYear) =>
  Object.entries(byYear).map(([year, value]) => [toYear(Number(year)), value])

/**
 * Each of the registration's accreditations, with the year it is keyed by.
 * @param {RegistrationView['accreditations']} accreditations
 * @returns {[Year, Accreditation][]}
 */
export const accreditationEntries = (accreditations) =>
  yearEntries(accreditations)

/**
 * The years holding at least one day in a standing the check counts, most
 * recent first. By default, every year with a day on which it was approved.
 * @param {RegistrationView} registration
 * @param {StandingCheck} [counts]
 * @returns {Year[]}
 */
export const registeredYears = ({ standingByDate }, counts = REGISTERED) =>
  yearEntries(standingByDate)
    .filter(([, byDate]) =>
      Object.values(byDate).some(({ standing }) => counts[standing])
    )
    .map(([year]) => year)
    .sort((one, other) => other - one)

/**
 * @param {[string, { standing: Standing }]} entry
 * @returns {boolean}
 */
const isAccredited = ([, { standing }]) => ACCREDITED[standing]

/**
 * The period an accreditation is shown as covering within its year, from its
 * first accredited day to its last. No accredited day leaves no period.
 * @param {RegistrationView} registration
 * @param {Year} year
 * @returns {DateRange}
 */
export const accreditedDateRange = ({ standingByDate }, year) => {
  const dates = Object.entries(standingByDate[year] ?? {}).sort(
    ([date], [other]) => date.localeCompare(other)
  )
  const first = dates.findIndex(isAccredited)

  if (first === -1) {
    return { validFrom: null, validTo: null }
  }

  const next = dates[dates.findLastIndex(isAccredited) + 1]

  return {
    validFrom: toCalendarDate(dates[first][0]),
    validTo: next
      ? dayBefore(toCalendarDate(next[0]))
      : toCalendarDate(`${year}-12-31`)
  }
}
