import { config } from '#config/config.js'

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
 * The latest year the service serves: the UTC year it is now, or the one
 * after where next year is open.
 * @returns {Year}
 */
export const latestOpenYear = () =>
  toYear(new Date().getUTCFullYear() + (config.get('openNextYear') ? 1 : 0))

const FIXED_YEAR = 2026

/**
 * The year a page uses until it has a year of its own in its URL.
 */
export const fixedYear = toYear(FIXED_YEAR)
