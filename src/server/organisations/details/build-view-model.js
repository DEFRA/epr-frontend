import { WASTE_PROCESSING_TYPE } from '#domain/organisations/model.js'
import { getDetailedMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'

/**
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
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
 *   accreditations: StatusTag[],
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
 * A registration that has resolved to no material of its own has only what the
 * applicant applied for to show, which is the coarse answer they gave.
 * @param {RegistrationResource} registration
 * @returns {string}
 */
const toMaterialName = ({ material, application }) =>
  getDetailedMaterialDisplayName(material ?? application.material)

/**
 * An exporter reprocesses nowhere this service records, so it heads no site.
 * @param {RegistrationResource} registration
 * @param {Localise} localise
 * @returns {string | null}
 */
const toSiteName = ({ application }, localise) =>
  application.wasteProcessingType === WASTE_PROCESSING_TYPE.EXPORTER
    ? null
    : (application.site?.address?.line1 ??
      localise('organisations:details:table:unknownSite'))

/**
 * @param {{
 *   registration: RegistrationResource,
 *   organisationId: string,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegistrationRow}
 */
const toRegistrationRow = ({ registration, organisationId, localiseUrl }) => {
  const number = registration.registrationNumber
  const status = toStatusTag(registration.status)
  const material = toMaterialName(registration)

  return {
    id: registration.id,
    number,
    status,
    material,
    regulator: registration.application.submittedToRegulator.toUpperCase(),
    accreditations: registration.accreditations.map(({ status: held }) =>
      toStatusTag(held)
    ),
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
 *   registrations: RegistrationResource[],
 *   organisationId: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {SiteTable[]}
 */
const toSiteTables = ({
  registrations,
  organisationId,
  localise,
  localiseUrl
}) =>
  registrations.reduce(
    (tables, registration) =>
      addToSite(tables, {
        name: toSiteName(registration, localise),
        row: toRegistrationRow({ registration, organisationId, localiseUrl })
      }),
    /** @type {SiteTable[]} */ ([])
  )

/**
 * A reader who asks for a tab holding nothing is moved to the one that holds
 * something. An organisation holding nothing at all has no tab to move them to,
 * so the tab they asked for stands.
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
 * The organisation is read for its own name alone. Everything the page says
 * about registrations comes from the registrations collection.
 * @param {{
 *   organisation: { id: string, companyDetails: { name: string } },
 *   registrations: RegistrationResource[],
 *   activeTab: Tab,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {OrganisationDetailsViewModel}
 */
export const buildViewModel = ({
  organisation,
  registrations,
  activeTab,
  localise,
  localiseUrl
}) => {
  const name = organisation.companyDetails.name
  const heading = localise('organisations:details:heading')
  const organisationPath = `/organisations/${organisation.id}`

  const tablesOf = (
    /** @type {(registration: RegistrationResource) => boolean} */ includes
  ) =>
    toSiteTables({
      registrations: registrations.filter(includes),
      organisationId: organisation.id,
      localise,
      localiseUrl
    })

  const reprocessorTables = tablesOf(
    ({ application }) =>
      application.wasteProcessingType === WASTE_PROCESSING_TYPE.REPROCESSOR
  )
  const exporterTables = tablesOf(
    ({ application }) =>
      application.wasteProcessingType === WASTE_PROCESSING_TYPE.EXPORTER
  )

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
