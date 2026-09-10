/**
 * @import { Organisation } from '#domain/organisations/model.js'
 */

/**
 * The trading name where there is one, otherwise the registered name.
 * @param {Organisation} organisation
 * @returns {string}
 */
export const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The records a page sits under, dropping any that has no number.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
export const toCaption = (parts) => parts.filter(Boolean).join(' - ')
