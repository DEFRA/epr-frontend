import { capitalize } from 'lodash-es'

import { config } from '#config/config.js'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { siteNameOf } from '#server/common/helpers/organisations/site-name.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'
import { getStatusClass } from './helpers/status-helpers.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @param {OrganisationNumber} orgNumber
 * @param {{ year?: Year | null, exporting?: boolean }} [options]
 * @returns {string}
 */
export const homePath = (orgNumber, { year, exporting } = {}) => {
  const yearSegment = year ? `/${year}` : ''
  const exportingSegment = exporting ? '/exporting' : ''

  return `${organisationPath({ organisationNumber: orgNumber })}${yearSegment}${exportingSegment}`
}

/**
 * @param {OrganisationNumber} orgNumber
 * @param {Year} year
 * @returns {string}
 */
export const chooseYearPath = (orgNumber, year) =>
  `${homePath(orgNumber, { year })}/choose-year`

/**
 * @typedef {{ text: string, classes?: string, format?: string } | { html: string, classes?: string }} TableCell
 */

/**
 * @typedef {{ number: string, registration: RegistrationView, accreditation: AccreditationView | undefined }} DisplayedRegistration
 */

/**
 *
 * @param {string} status
 * @returns {string}
 */
function createTag(status) {
  return `<strong class="govuk-tag govuk-tag--${getStatusClass(status)}">${capitalize(status)}</strong>`
}

/**
 * @param {AccreditationView | undefined} accreditation
 * @param {{ availableAmount?: number } | undefined} wasteBalance
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const formatWasteBalance = (accreditation, wasteBalance, localise) =>
  accreditation
    ? formatTonnage(wasteBalance?.availableAmount)
    : localise('organisations:table:notApplicable')

/**
 * @param {AccreditationView | undefined} accreditation
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const createAccreditationTag = (accreditation, localise) =>
  createTag(
    accreditation?.status.current ??
      localise('organisations:table:notAccredited')
  )

/**
 * The registration's page: its accreditation for the year where it holds one, whatever its status.
 * @param {RegistrationView} registration
 * @param {RegistrationKeys} keys
 * @param {Year | null} selectedYear
 * @returns {string}
 */
const registrationRowPath = (registration, keys, selectedYear) => {
  const year = String(selectedYear)

  return Object.hasOwn(registration.accreditations, year)
    ? accreditationPath({ ...keys, year })
    : registrationPath(keys)
}

/**
 * Creates a row for a given registration
 * @param {HapiRequest} request
 * @param {OrganisationNumber} orgNumber
 * @param {DisplayedRegistration} displayed
 * @param {WasteBalanceMap} wasteBalanceMap - Map of accreditation number to balance data
 * @param {Year | null} selectedYear
 * @returns {TableCell[]} - Array of table cells
 */
function createRow(
  request,
  orgNumber,
  { number, registration, accreditation },
  wasteBalanceMap,
  selectedYear
) {
  const { t: localise } = request
  const registrationUrl = request.localiseUrl(
    registrationRowPath(
      registration,
      { organisationNumber: String(orgNumber), registrationNumber: number },
      selectedYear
    )
  )

  /** @type {TableCell[]} */
  const cells = [
    {
      text: getMaterialDisplayName(registration.material),
      classes: 'govuk-!-width-one-quarter'
    },
    {
      html: createTag(registration.status.current)
    },
    {
      html: createAccreditationTag(accreditation, localise)
    },
    {
      text: formatWasteBalance(
        accreditation,
        accreditation && wasteBalanceMap[accreditation.accreditationNumber],
        localise
      ),
      format: 'numeric'
    },
    {
      html: `<a href="${registrationUrl}" class="govuk-link">${localise('organisations:table:site:actions:select')}</a>`,
      classes: 'govuk-!-text-align-right govuk-!-padding-right-2'
    }
  ]

  return cells
}

/**
 * Creates table headers for registration sites
 * @param {(key: string) => string} localise - Translation function
 * @returns {Array} Array of header objects
 */
function createTableHeaders(localise) {
  const headers = [
    { text: localise('organisations:table:site:headings:materials') },
    {
      text: localise('organisations:table:site:headings:registrationStatuses')
    },
    {
      text: localise('organisations:table:site:headings:accreditationStatuses')
    }
  ]

  headers.push(
    {
      text: localise('organisations:table:site:headings:availableBalance'),
      format: 'numeric'
    },
    { text: '' }
  )

  return headers
}

/**
 * Adds a row to an existing site or creates a new site entry
 * @param {Array} sites - Current sites array
 * @param {RegistrationView} registration - Registration data
 * @param {Array} row - Row data to add
 * @param {(key: string) => string} localise - Translation function
 * @returns {Array} Updated sites array
 */
function addRowToSites(sites, registration, row, localise) {
  const siteName = siteNameOf(registration)
  const existingSite = sites.find(({ name }) => name === siteName)

  if (existingSite) {
    return sites.map((site) =>
      site.name === existingSite.name
        ? { ...site, rows: [...site.rows, row] }
        : site
    )
  }

  return [
    ...sites,
    {
      name: siteName,
      head: createTableHeaders(localise),
      rows: [row]
    }
  ]
}

/**
 * Organises registrations by site for a given waste processing type
 * @param {HapiRequest} request
 * @param {OrganisationNumber} orgNumber
 * @param {DisplayedRegistration[]} displayedRegistrations
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @param {WasteBalanceMap} wasteBalanceMap - Map of accreditation number to balance data
 * @param {Year | null} selectedYear
 * @returns {Array} Array of sites with their materials
 */
function getRegistrationSites(
  request,
  orgNumber,
  displayedRegistrations,
  wasteProcessingType,
  wasteBalanceMap,
  selectedYear
) {
  const { t: localise } = request

  const filtered = displayedRegistrations.filter(
    ({ registration }) =>
      registration.wasteProcessingType === wasteProcessingType
  )

  return filtered.reduce((sites, displayed) => {
    const row = createRow(
      request,
      orgNumber,
      displayed,
      wasteBalanceMap,
      selectedYear
    )
    return addRowToSites(sites, displayed.registration, row, localise)
  }, [])
}

const tabTypes = Object.freeze({
  EXPORTER: 'EXPORTER',
  REPROCESSOR: 'REPROCESSOR'
})

/**
 * Determines which sites to display and the table title based on available data and active tab
 * @param {object} params
 * @param {Array} params.reprocessorSites - Reprocessor sites
 * @param {Array} params.exporterSites - Exporter sites
 * @param {string} params.activeTab - Currently active tab
 * @param {(key: string) => string} params.localise - Translation function
 * @returns {{sites: Array, tableTitle: string, shouldRenderTabs: boolean}}
 */
function getActiveSitesAndTitle({
  reprocessorSites,
  exporterSites,
  activeTab,
  localise
}) {
  const hasReprocessorSites = reprocessorSites.length > 0
  const hasExporterSites = exporterSites.length > 0
  const shouldRenderTabs = hasReprocessorSites && hasExporterSites

  const showReprocessor =
    (!shouldRenderTabs && hasReprocessorSites) ||
    (shouldRenderTabs && activeTab === tabTypes.REPROCESSOR)

  if (showReprocessor) {
    return {
      sites: reprocessorSites,
      tableTitle: localise('organisations:table:titleReprocessor'),
      shouldRenderTabs
    }
  }

  if (hasExporterSites) {
    return {
      sites: exporterSites,
      tableTitle: localise('organisations:table:titleExporter'),
      shouldRenderTabs
    }
  }

  return { sites: [], tableTitle: '', shouldRenderTabs }
}

/**
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {{
 *   orgNumber: OrganisationNumber,
 *   organisation: { displayName: string },
 *   displayedRegistrations: DisplayedRegistration[],
 *   wasteBalanceMap: WasteBalanceMap,
 *   year: Year | null,
 *   hasOtherYears?: boolean
 * }} page
 */
export function renderHome(
  request,
  h,
  {
    orgNumber,
    organisation,
    displayedRegistrations,
    wasteBalanceMap,
    year,
    hasOtherYears = false
  }
) {
  const { t: localise } = request

  const isExporterTab = request.path.endsWith('/exporting')
  const activeTab = isExporterTab ? tabTypes.EXPORTER : tabTypes.REPROCESSOR

  const reprocessorSites = getRegistrationSites(
    request,
    orgNumber,
    displayedRegistrations,
    'reprocessor',
    wasteBalanceMap,
    year
  )

  const exporterSites = getRegistrationSites(
    request,
    orgNumber,
    displayedRegistrations,
    'exporter',
    wasteBalanceMap,
    year
  )

  const { sites, tableTitle, shouldRenderTabs } = getActiveSitesAndTitle({
    reprocessorSites,
    exporterSites,
    activeTab,
    localise
  })

  const organisationName = organisation.displayName

  return h.view('organisations/index', {
    pageTitle: localise('organisations:pageTitle', {
      name: organisationName
    }),
    organisationName,
    activeTab,
    reprocessorUrl: request.localiseUrl(homePath(orgNumber, { year })),
    exporterUrl: request.localiseUrl(
      homePath(orgNumber, { year, exporting: true })
    ),
    shouldRenderTabs,
    selectedYear: config.get('featureFlags.navigateAcrossYears') ? year : null,
    chooseYearUrl:
      config.get('featureFlags.navigateAcrossYears') && year && hasOtherYears
        ? request.localiseUrl(chooseYearPath(orgNumber, year))
        : null,
    sites,
    tableTitle,
    tabTypes
  })
}
