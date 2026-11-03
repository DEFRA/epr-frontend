import {
  toCalendarDate,
  utcCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { toYear } from '#server/common/helpers/year.js'

/**
 * @import { CalendarDate } from '#server/common/helpers/calendar-date.js'
 * @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { DateRange } from './types.js'
 */

/**
 * @param {CalendarDate} date
 * @returns {CalendarDate}
 */
const dayBefore = (date) => {
  const shifted = new Date(date)
  shifted.setUTCDate(shifted.getUTCDate() - 1)
  return utcCalendarDate(shifted)
}

/**
 * @param {string} date
 * @param {CalendarDate} today
 * @returns {boolean}
 */
const hasStarted = (date, today) => date.localeCompare(today) <= 0

/**
 * The years holding at least one approved day up to today, most recent first.
 * @param {RegistrationView} registration
 * @param {Date} [now]
 * @returns {Year[]}
 */
export const registeredYears = ({ regAccStatusByDate }, now = new Date()) => {
  const today = utcCalendarDate(now)

  return Object.entries(regAccStatusByDate)
    .filter(([, byDate]) =>
      Object.entries(byDate).some(
        ([date, { status }]) =>
          status !== 'cancelled' && hasStarted(date, today)
      )
    )
    .map(([year]) => toYear(Number(year)))
    .sort((one, other) => other - one)
}

/**
 * The period an accreditation is shown as covering within its year, from its
 * first accredited day to its last. No accredited day leaves no period.
 * @param {RegistrationView} registration
 * @param {Year} year
 * @returns {DateRange}
 */
export const accreditedDateRange = ({ regAccStatusByDate }, year) => {
  const dates = Object.entries(regAccStatusByDate[year] ?? {})
  const first = dates.findIndex(([, { status }]) => status === 'accredited')

  if (first === -1) {
    return { validFrom: null, validTo: null }
  }

  const last = dates.findLastIndex(([, { status }]) => status === 'accredited')
  const next = dates[last + 1]

  return {
    validFrom: dates[first][0],
    validTo: next
      ? dayBefore(toCalendarDate(next[0]))
      : toCalendarDate(`${year}-12-31`)
  }
}

/**
 * Whether the year holds any registered-only day up to today.
 * @param {RegistrationView} registration
 * @param {Year} year
 * @param {Date} [now]
 * @returns {boolean}
 */
export const hasRegisteredOnlyTime = (
  { regAccStatusByDate },
  year,
  now = new Date()
) =>
  Object.entries(regAccStatusByDate[year] ?? {}).some(
    ([date, { status }]) =>
      status === 'registeredOnly' && hasStarted(date, utcCalendarDate(now))
  )
