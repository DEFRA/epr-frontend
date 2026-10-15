/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
 * The trading name where there is one, otherwise the registered name.
 * @param {Organisation} organisation
 * @returns {string}
 */
export const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The read model's trading name where there is one, otherwise its name.
 * @param {Pick<OrganisationView, 'name' | 'tradingName'>} organisation
 * @returns {string}
 */
export const organisationViewName = ({ name, tradingName }) =>
  tradingName?.trim() || name

/**
 * The records a page sits under, dropping any that has no number.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
export const toCaption = (parts) => parts.filter(Boolean).join(' - ')
