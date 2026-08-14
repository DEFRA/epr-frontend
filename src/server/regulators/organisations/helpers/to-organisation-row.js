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
 *   status: string,
 *   href: string
 * }} OrganisationRow
 */

/**
 * Projects an organisation onto the columns the results table shows. The name
 * opens the organisation, which the operator's own page already serves and a
 * regulator already reads, and which carries the registration and accreditation
 * numbers this table leaves out.
 * @param {SearchedOrganisation} organisation
 * @returns {OrganisationRow}
 */
export const toOrganisationRow = ({
  id,
  orgId,
  companyDetails,
  status,
  submittedToRegulator
}) => ({
  name: companyDetails.name,
  organisationId: String(orgId),
  regulator: submittedToRegulator?.toUpperCase() ?? '',
  status,
  href: `/organisations/${id}`
})
