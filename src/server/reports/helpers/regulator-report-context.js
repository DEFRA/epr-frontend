import { paths } from '#server/paths.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ caption: string, breadcrumbs: Crumb[], backUrl: string }} RegulatorReportContext
 */

/**
 * An organisation trading under another name is known by it. Matches the rule
 * the regulator's registration and accreditation pages already apply, so one
 * organisation reads the same on every page of the trail.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * A record that holds no number has nothing to name it by, so it is left out
 * rather than shown as an empty gap between two dashes.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
const toCaption = (parts) => parts.filter(Boolean).join(' - ')

/**
 * The trail a regulator walked to reach a report, and the identity of the
 * record they are looking at.
 *
 * An operator needs none of this: they arrive from their own reports list,
 * which is the only report list they have, and the page keeps its back link.
 * A regulator arrives from an accreditation page carrying a four-crumb trail
 * and a three-part caption, and without this would land on a page that names
 * neither the organisation nor the period's registration, then be offered a
 * way back to a reports list they have never seen.
 *
 * The accreditation crumb is dropped where the registration holds no live
 * accreditation, which is the registered-only case: the report is still owed
 * under the registration, so the trail simply stops one step earlier and the
 * back link goes there instead.
 * @param {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: Accreditation | undefined,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegulatorReportContext}
 */
export const buildRegulatorReportContext = ({
  organisation,
  registration,
  accreditation,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const registrationPath = `/organisations/${organisation.id}/registrations/${registration.id}`
  const parentPath = accreditation
    ? `${registrationPath}/accreditations/${accreditation.id}`
    : registrationPath

  return {
    caption: toCaption([
      name,
      registration.registrationNumber,
      accreditation?.accreditationNumber
    ]),
    breadcrumbs: [
      {
        text: localise('registrations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      {
        text: name,
        href: localiseUrl(`/organisations/${organisation.id}`)
      },
      {
        text: localise('registrations:details:heading'),
        href: localiseUrl(registrationPath)
      },
      ...(accreditation
        ? [
            {
              text: localise('registrations:details:accreditation:breadcrumb'),
              href: localiseUrl(parentPath)
            }
          ]
        : []),
      { text: localise('reports:view:breadcrumb') }
    ],
    backUrl: localiseUrl(parentPath)
  }
}
