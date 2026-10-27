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

/** @returns {Year} */
export const currentYear = () => toYear(new Date().getUTCFullYear())

export const YEAR_SEGMENT = /^\d{4}$/
