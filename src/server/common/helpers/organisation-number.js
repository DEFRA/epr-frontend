/**
 * The natural key of an organisation, such as '500123'.
 *
 * Branded so it cannot be confused with other keys, such as a registration number.
 * `organisationNumber` is the only constructor.
 * @typedef {string & { readonly __brand: 'OrganisationNumber' }} OrganisationNumber
 */

/**
 * @param {string} value
 * @returns {OrganisationNumber}
 */
export const organisationNumber = (value) =>
  /** @type {OrganisationNumber} */ (value)
