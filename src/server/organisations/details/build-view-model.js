import { getDetailedMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import {
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 * @typedef {'REPROCESSOR' | 'EXPORTER'} Tab
 * @typedef {{ text: string, href?: string }} Crumb
 */

/**
 * One registration as the table reads it. A registration that never earned a
 * number, and one that is on no accreditation, each leave their cell unset
 * rather than carrying copy the template is free to choose.
 * @typedef {{
 *   id: string,
 *   number: string | null,
 *   status: StatusTag,
 *   material: string,
 *   regulator: string,
 *   accreditation: StatusTag | null,
 *   href: string
 * }} RegistrationRow
 * @typedef {{ name: string | null, registrations: RegistrationRow[] }} SiteTable
 * @typedef {{
 *   activeTab: Tab,
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   exporterUrl: string,
 *   pageTitle: string,
 *   reprocessorUrl: string,
 *   shouldRenderTabs: boolean,
 *   siteTables: SiteTable[]
 * }} OrganisationDetailsViewModel
 */

/**
 * The backend resolves glass to the process it was recycled by, and names the
 * material itself for everything else. A regulator reads records this service
 * did not create, so a material it does not know keeps its own name rather
 * than failing the page.
 * @param {Registration} registration
 * @returns {string}
 */
const toMaterialName = ({ material, glassRecyclingProcess }) =>
  getDetailedMaterialDisplayName(glassRecyclingProcess?.[0] ?? material)

/**
 * An exporter reprocesses nowhere this service records, so its registrations
 * are listed under no site at all rather than under an empty heading.
 * @param {Registration} registration
 * @param {Localise} localise
 * @returns {string | null}
 */
const toSiteName = (registration, localise) =>
  isExporterRegistration(registration)
    ? null
    : (registration.site?.address?.line1 ??
      localise('organisations:details:table:unknownSite'))

/**
 * @param {{
 *   registration: Registration,
 *   accreditation: Accreditation | undefined,
 *   organisationId: string,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegistrationRow}
 */
const toRegistrationRow = ({
  registration,
  accreditation,
  organisationId,
  localiseUrl
}) => ({
  id: registration.id,
  number: registration.registrationNumber ?? null,
  status: toStatusTag(registration.status),
  material: toMaterialName(registration),
  regulator: registration.submittedToRegulator.toUpperCase(),
  accreditation: accreditation ? toStatusTag(accreditation.status) : null,
  href: localiseUrl(
    `/organisations/${organisationId}/registrations/${registration.id}`
  )
})

/**
 * Groups rows under the site they are processed at, keeping the record's own
 * order: sites in the order they are first met, registrations in the order the
 * organisation lists them.
 * @param {SiteTable[]} tables
 * @param {{ name: string | null, row: RegistrationRow }} entry
 * @returns {SiteTable[]}
 */
const addToSite = (tables, { name, row }) => {
  const existing = tables.find((table) => table.name === name)

  return existing
    ? tables.map((table) =>
        table === existing
          ? { ...table, registrations: [...table.registrations, row] }
          : table
      )
    : [...tables, { name, registrations: [row] }]
}

/**
 * The whole record, not the operator's actionable subset: a regulator reading
 * an organisation is shown every registration it holds, whatever its status,
 * and the accreditation each one is on, whatever that status is too.
 * @param {{
 *   organisation: Organisation,
 *   includes: (registration: Registration) => boolean,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {SiteTable[]}
 */
const toSiteTables = ({ organisation, includes, localise, localiseUrl }) => {
  const accreditationById = new Map(
    organisation.accreditations.map((accreditation) => [
      accreditation.id,
      accreditation
    ])
  )

  return organisation.registrations.filter(includes).reduce(
    (tables, registration) =>
      addToSite(tables, {
        name: toSiteName(registration, localise),
        row: toRegistrationRow({
          registration,
          accreditation: registration.accreditationId
            ? accreditationById.get(registration.accreditationId)
            : undefined,
          organisationId: organisation.id,
          localiseUrl
        })
      }),
    /** @type {SiteTable[]} */ ([])
  )
}

/**
 * An organisation trading under another name is known by it, so that is the
 * name the regulator is shown.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * @param {{
 *   organisation: Organisation,
 *   activeTab: Tab,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {OrganisationDetailsViewModel}
 */
export const buildViewModel = ({
  organisation,
  activeTab,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const heading = localise('organisations:details:heading')
  const organisationPath = `/organisations/${organisation.id}`

  const tablesOf = (
    /** @type {(registration: Registration) => boolean} */ includes
  ) => toSiteTables({ organisation, includes, localise, localiseUrl })

  const reprocessorTables = tablesOf(isReprocessorRegistration)
  const exporterTables = tablesOf(isExporterRegistration)

  // The tabs are the only way to reach the exporting address, so an
  // organisation that exports and reprocesses nowhere is shown what it has
  // rather than an empty reprocessor table it cannot navigate out of.
  const tab =
    activeTab === 'REPROCESSOR' && reprocessorTables.length === 0
      ? 'EXPORTER'
      : activeTab

  return {
    activeTab: tab,
    breadcrumbs: [
      {
        text: localise('organisations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      { text: name }
    ],
    caption: name,
    exporterUrl: localiseUrl(`${organisationPath}/exporting`),
    pageTitle: `${name}: ${heading}`,
    reprocessorUrl: localiseUrl(organisationPath),
    shouldRenderTabs: reprocessorTables.length > 0 && exporterTables.length > 0,
    siteTables: tab === 'EXPORTER' ? exporterTables : reprocessorTables
  }
}
