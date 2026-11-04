/**
 * @import { Brand } from './brand.js'
 */

/**
 * The natural key of an organisation, such as '500123'.
 *
 * Branded so it cannot be confused with other keys, such as a registration number.
 * `toOrganisationNumber` is the only constructor.
 * @typedef {Brand<string, 'OrganisationNumber'>} OrganisationNumber
 */

/**
 * @param {string} value
 * @returns {OrganisationNumber}
 */
export const toOrganisationNumber = (value) =>
  /** @type {OrganisationNumber} */ (value)
