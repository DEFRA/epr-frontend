/**
 * @import { Brand } from './brand.js'
 * @import { CalendarDate } from './calendar-date.js'
 */

/**
 * A calendar year such as 2027.
 *
 * Branded so a year cannot be confused with the other numbers the page
 * handles, such as an organisation number. `toYear` is the only constructor.
 * @typedef {Brand<number, 'Year'>} Year
 */

/**
 * @param {number} value
 * @returns {Year}
 */
export const toYear = (value) => /** @type {Year} */ (value)

/**
 * The year it is now, in UTC.
 * @returns {Year}
 */
export const currentYear = () => toYear(new Date().getUTCFullYear())

/**
 * A bare date names no instant, so its year needs no time zone.
 * @param {CalendarDate} date
 * @returns {Year}
 */
export const yearOf = (date) => toYear(Number(date.slice(0, 4)))

/**
 * @param {Year[]} years
 * @returns {Year | undefined}
 */
export const defaultYear = (years) => {
  const thisYear = currentYear()
  const [latestYear] = years.toSorted((one, other) => other - one)
  return years.includes(thisYear) ? thisYear : latestYear
}
