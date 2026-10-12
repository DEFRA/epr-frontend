/**
 * The numeric natural key of an organisation, such as 500123.
 *
 * Branded so it cannot be confused with other numbers, such as a year.
 * `organisationNumber` is the only constructor.
 * @typedef {number & { readonly __brand: 'OrganisationNumber' }} OrganisationNumber
 */

/**
 * @param {number} value
 * @returns {OrganisationNumber}
 */
export const organisationNumber = (value) =>
  /** @type {OrganisationNumber} */ (value)
