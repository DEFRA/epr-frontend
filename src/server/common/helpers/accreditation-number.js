/**
 * @import { Brand } from './brand.js'
 */

/**
 * The number an accreditation is issued under, such as 'A26ER5001180041PL'.
 *
 * Branded so it cannot be confused with other keys, such as a registration number.
 * `toAccreditationNumber` is the only constructor.
 * @typedef {Brand<string, 'AccreditationNumber'>} AccreditationNumber
 */

/**
 * @param {string} value
 * @returns {AccreditationNumber}
 */
export const toAccreditationNumber = (value) =>
  /** @type {AccreditationNumber} */ (value)
