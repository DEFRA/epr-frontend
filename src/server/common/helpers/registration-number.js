/**
 * @import { Brand } from './brand.js'
 */

/**
 * The natural key of a registration, such as 'R26ER5001180041PL'.
 *
 * Branded so it cannot be confused with other keys, such as an organisation number or an accreditation number.
 * `toRegistrationNumber` is the only constructor.
 * @typedef {Brand<string, 'RegistrationNumber'>} RegistrationNumber
 */

/**
 * @param {string} value
 * @returns {RegistrationNumber}
 */
export const toRegistrationNumber = (value) =>
  /** @type {RegistrationNumber} */ (value)
