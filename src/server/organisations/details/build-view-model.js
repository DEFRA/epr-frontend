import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { siteNameOf } from '#server/common/helpers/organisations/site-name.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'
import {
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

/**
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 * @typedef {'REPROCESSOR' | 'EXPORTER'} Tab
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{
 *   number: string,
 *   status: StatusTag,
 *   material: string,
 *   regulator: string,
 *   accreditations: StatusTag[],
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
 * Every year's accreditation, newest first.
 * @param {RegistrationView['accreditations']} accreditations
 * @returns {StatusTag[]}
 */
const toAccreditationTags = (accreditations) =>
  Object.entries(accreditations)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, { status }]) => {
      const tag = toStatusTag(status.current)
      return { ...tag, text: `${year}: ${tag.text}` }
    })

/**
 * @param {{
 *   number: string,
 *   registration: RegistrationView,
 *   organisationNumber: string,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegistrationRow}
 */
const toRegistrationRow = ({
  number,
  registration,
  organisationNumber,
  localiseUrl
}) => ({
  number,
  status: toStatusTag(registration.status.current),
  material: getMaterialDisplayName(registration.material),
  regulator: registration.submittedToRegulator.code.toUpperCase(),
  accreditations: toAccreditationTags(registration.accreditations),
  href: localiseUrl(
    registrationPath({ organisationNumber, registrationNumber: number })
  )
})

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
 *   registrations: Array<[string, RegistrationView]>,
 *   organisationNumber: string,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {SiteTable[]}
 */
const toSiteTables = ({ registrations, organisationNumber, localiseUrl }) =>
  registrations.reduce(
    (tables, [number, registration]) =>
      addToSite(tables, {
        name: siteNameOf(registration),
        row: toRegistrationRow({
          number,
          registration,
          organisationNumber,
          localiseUrl
        })
      }),
    /** @type {SiteTable[]} */ ([])
  )

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
  if (reprocessorTables.length === 0 && exporterTables.length > 0) {
    return 'EXPORTER'
  }

  if (exporterTables.length === 0 && reprocessorTables.length > 0) {
    return 'REPROCESSOR'
  }

  return activeTab
}

/**
 * @param {{
 *   organisation: OrganisationView,
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
  const { name } = organisation
  const heading = localise('organisations:details:heading')
  const organisationNumber = String(organisation.organisationNumber)
  const homePath = organisationPath({ organisationNumber })
  const registrations = Object.entries(organisation.registrations)

  const tablesOf = (
    /** @type {RegistrationView['wasteProcessingType']} */ wasteProcessingType
  ) =>
    toSiteTables({
      registrations: registrations.filter(
        ([, registration]) =>
          registration.wasteProcessingType === wasteProcessingType
      ),
      organisationNumber,
      localiseUrl
    })

  const reprocessorTables = tablesOf('reprocessor')
  const exporterTables = tablesOf('exporter')

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
    exporterUrl: localiseUrl(`${homePath}/exporting`),
    pageTitle: `${name}: ${heading}`,
    reprocessorUrl: localiseUrl(homePath),
    shouldRenderTabs: holdsBoth,
    siteTables: tab === 'EXPORTER' ? exporterTables : reprocessorTables
  }
}
