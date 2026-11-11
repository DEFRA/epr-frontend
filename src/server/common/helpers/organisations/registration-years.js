import { REG_ACC_STATUS } from '#domain/registration.js'
import {
  dayBefore,
  toCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { toYear } from '#server/common/helpers/year.js'

/**
 * @import { RegAccStatus } from '#domain/registration.js'
 * @import { Accreditation, RegistrationView } from './organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { DateRange } from './registration-resource.js'
 */

/**
 * Which statuses a check counts. Keyed by every status, so a status the
 * backend adds must be classified here before this compiles.
 * @typedef {Readonly<Record<RegAccStatus, boolean>>} StatusCheck
 */

/** @type {StatusCheck} */
export const REGISTERED = Object.freeze({
  [REG_ACC_STATUS.REGISTERED_ONLY]: true,
  [REG_ACC_STATUS.ACCREDITED]: true,
  [REG_ACC_STATUS.CANCELLED]: false
})

/** @type {StatusCheck} */
export const REGISTERED_ONLY = Object.freeze({
  [REG_ACC_STATUS.REGISTERED_ONLY]: true,
  [REG_ACC_STATUS.ACCREDITED]: false,
  [REG_ACC_STATUS.CANCELLED]: false
})

/** @type {StatusCheck} */
const ACCREDITED = Object.freeze({
  [REG_ACC_STATUS.REGISTERED_ONLY]: false,
  [REG_ACC_STATUS.ACCREDITED]: true,
  [REG_ACC_STATUS.CANCELLED]: false
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
 * The years holding at least one day in a status the check counts, most
 * recent first. By default, every year with a day on which it was approved.
 * @param {RegistrationView} registration
 * @param {StatusCheck} [counts]
 * @returns {Year[]}
 */
export const registeredYears = ({ regAccStatusByDate }, counts = REGISTERED) =>
  yearEntries(regAccStatusByDate)
    .filter(([, byDate]) =>
      Object.values(byDate).some(({ status }) => counts[status])
    )
    .map(([year]) => year)
    .sort((one, other) => other - one)

/**
 * @param {[string, { status: RegAccStatus }]} entry
 * @returns {boolean}
 */
const isAccredited = ([, { status }]) => ACCREDITED[status]

/**
 * The period an accreditation is shown as covering within its year, from its
 * first accredited day to its last. No accredited day leaves no period.
 * @param {RegistrationView} registration
 * @param {Year} year
 * @returns {DateRange}
 */
export const accreditedDateRange = ({ regAccStatusByDate }, year) => {
  const dates = Object.entries(regAccStatusByDate[year] ?? {}).sort(
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
