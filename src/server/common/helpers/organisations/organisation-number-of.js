import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'

/**
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 */

/**
 * The organisation number of an organisation the backend serves with a
 * numeric `orgId`.
 * @param {{ orgId: number }} organisation
 * @returns {OrganisationNumber}
 */
export const organisationNumberOf = ({ orgId }) =>
  toOrganisationNumber(String(orgId))
