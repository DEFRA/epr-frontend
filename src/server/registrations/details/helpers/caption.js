/**
 * @import { Organisation } from '#domain/organisations/model.js'
 */

/**
 * An organisation trading under another name is known by it, so that is the
 * name a regulator is shown.
 * @param {Organisation} organisation
 * @returns {string}
 */
export const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The records a page sits under, in the order its breadcrumbs walk them. A
 * record holding no number has nothing to name it by, so it is left out rather
 * than shown as an empty gap between two dashes.
 *
 * Shared by every regulator page beneath a registration, so a caption reads
 * the same wherever it appears.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
export const toCaption = (parts) => parts.filter(Boolean).join(' - ')
