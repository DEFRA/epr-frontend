/**
 * @import { Brand } from './brand.js'
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
export const thisYear = () => toYear(new Date().getUTCFullYear())

const FIXED_YEAR = 2026

/**
 * The year a page uses until it has a year of its own in its URL.
 */
export const fixedYear = toYear(FIXED_YEAR)
