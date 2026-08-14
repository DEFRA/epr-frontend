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
 *
 * The caller supplies the localiser, so following a name keeps the language the
 * regulator is reading in rather than handing them the English route.
 * @param {SearchedOrganisation} organisation
 * @param {(path: string) => string} localiseUrl
 * @returns {OrganisationRow}
 */
export const toOrganisationRow = (
  { id, orgId, companyDetails, status, submittedToRegulator },
  localiseUrl
) => ({
  name: companyDetails.name,
  organisationId: String(orgId),
  regulator: submittedToRegulator?.toUpperCase() ?? '',
  status,
  href: localiseUrl(`/organisations/${id}`)
})
