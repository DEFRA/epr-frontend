import { REG_ACC_STATUS } from '#domain/organisations/model.js'
import {
  dayBefore,
  toCalendarDate,
  utcCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { yearEntries } from '#server/common/helpers/organisations/accreditation-entries.js'

/**
 * @import { RegAccStatus } from '#domain/organisations/model.js'
 * @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { DateRange } from './types.js'
 */

/** @type {readonly RegAccStatus[]} */
const REGISTERED_STATUSES = [
  REG_ACC_STATUS.REGISTERED_ONLY,
  REG_ACC_STATUS.ACCREDITED
]

/**
 * The years holding at least one day in the given statuses up to today, most
 * recent first. By default, every year with a day on which it was approved.
 * @param {RegistrationView} registration
 * @param {readonly RegAccStatus[]} [statuses]
 * @returns {Year[]}
 */
export const registeredYears = (
  { regAccStatusByDate },
  statuses = REGISTERED_STATUSES
) => {
  const today = utcCalendarDate(new Date())

  return yearEntries(regAccStatusByDate)
    .filter(([, byDate]) =>
      Object.entries(byDate).some(
        ([date, { status }]) =>
          statuses.includes(status) && date.localeCompare(today) <= 0
      )
    )
    .map(([year]) => year)
    .sort((one, other) => other - one)
}

/**
 * @param {[string, { status: RegAccStatus }]} entry
 * @returns {boolean}
 */
const isAccredited = ([, { status }]) => status === REG_ACC_STATUS.ACCREDITED

/**
 * The period an accreditation is shown as covering within its year, from its
 * first accredited day to its last. No accredited day leaves no period.
 * @param {RegistrationView} registration
 * @param {Year} year
 * @returns {DateRange}
 */
export const accreditedDateRange = ({ regAccStatusByDate }, year) => {
  const dates = Object.entries(regAccStatusByDate[year] ?? {})
  const first = dates.findIndex(isAccredited)

  if (first === -1) {
    return { validFrom: null, validTo: null }
  }

  const next = dates[dates.findLastIndex(isAccredited) + 1]

  return {
    validFrom: dates[first][0],
    validTo: next
      ? dayBefore(toCalendarDate(next[0]))
      : toCalendarDate(`${year}-12-31`)
  }
}
