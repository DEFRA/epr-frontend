import { toStatusTag } from './to-status-tag.js'

/** @import { StatusTag } from './to-status-tag.js' */

/**
 * An organisation as one item of the backend's organisations page.
 * @typedef {{
 *   id: string,
 *   orgId: number,
 *   companyDetails: { name: string },
 *   status: string,
 *   submittedToRegulator?: string
 * }} SearchedOrganisation
 *
 * One row of the results table.
 * @typedef {{
 *   name: string,
 *   organisationId: string,
 *   regulator: string,
 *   status: StatusTag,
 *   href: string
 * }} OrganisationRow
 */

/**
 * Projects an organisation onto the columns the browse table shows. The row
 * carries the link the Actions column offers, which opens the organisation's
 * own page - the page the operator already has and a regulator already reads,
 * and which carries the registration and accreditation numbers this table
 * leaves out.
 *
 * The list is not scoped to the caller's own body, so the row names the
 * regulator the organisation submitted to. That is the only thing telling an
 * officer whose organisation a row belongs to.
 *
 * The caller supplies the localiser, so following the link keeps the language
 * the regulator is reading in rather than handing them the English route.
 * @param {SearchedOrganisation} organisation
 * @param {(path: string) => string} localiseUrl
 * @param {(key: string) => string} localise
 * @returns {OrganisationRow}
 */
export const toOrganisationRow = (
  { id, orgId, companyDetails, status, submittedToRegulator },
  localiseUrl,
  localise
) => ({
  name: companyDetails.name,
  organisationId: String(orgId),
  regulator: submittedToRegulator?.toUpperCase() ?? '',
  status: toStatusTag(status, localise),
  href: localiseUrl(`/organisations/${id}`)
})
