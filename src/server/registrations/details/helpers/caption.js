/**
 * @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

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
