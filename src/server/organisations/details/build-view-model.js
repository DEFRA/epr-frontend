import { MATERIAL } from '#domain/organisations/model.js'
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
 * @typedef {{
 *   id: string,
 *   number: string | null,
 *   status: StatusTag,
 *   material: string,
 *   regulator: string,
 *   accreditation: StatusTag | null,
 *   href: string,
 *   linkName: string
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
 * A glass record is for the process it was split to, and one carrying any
 * number of processes but one was never split, so it is for glass alone.
 * @param {Registration} registration
 * @returns {string}
 */
const toMaterialName = ({ material, glassRecyclingProcess }) =>
  getDetailedMaterialDisplayName(
    material === MATERIAL.GLASS && glassRecyclingProcess?.length === 1
      ? glassRecyclingProcess[0]
      : material
  )

/**
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
}) => {
  const number = registration.registrationNumber ?? null
  const status = toStatusTag(registration.status)
  const material = toMaterialName(registration)

  return {
    id: registration.id,
    number,
    status,
    material,
    regulator: registration.submittedToRegulator.toUpperCase(),
    accreditation: accreditation ? toStatusTag(accreditation.status) : null,
    href: localiseUrl(
      `/organisations/${organisationId}/registrations/${registration.id}`
    ),
    linkName: number ?? `${material}, ${status.text}`
  }
}

/**
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
 * @param {{
 *   reprocessorTables: SiteTable[],
 *   exporterTables: SiteTable[],
 *   activeTab: Tab
 * }} params
 * @returns {Tab}
 */
const toTabWithRegistrations = ({
  reprocessorTables,
  exporterTables,
  activeTab
}) => {
  if (reprocessorTables.length === 0) {
    return 'EXPORTER'
  }

  if (exporterTables.length === 0) {
    return 'REPROCESSOR'
  }

  return activeTab
}

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
  const name = organisation.companyDetails.name
  const heading = localise('organisations:details:heading')
  const organisationPath = `/organisations/${organisation.id}`

  const tablesOf = (
    /** @type {(registration: Registration) => boolean} */ includes
  ) => toSiteTables({ organisation, includes, localise, localiseUrl })

  const reprocessorTables = tablesOf(isReprocessorRegistration)
  const exporterTables = tablesOf(isExporterRegistration)

  const holdsBoth = reprocessorTables.length > 0 && exporterTables.length > 0
  const tab = toTabWithRegistrations({
    reprocessorTables,
    exporterTables,
    activeTab
  })

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
    shouldRenderTabs: holdsBoth,
    siteTables: tab === 'EXPORTER' ? exporterTables : reprocessorTables
  }
}
