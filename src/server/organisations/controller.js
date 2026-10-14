import { capitalize } from 'lodash-es'

import { config } from '#config/config.js'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { isAccreditationActive } from '#server/common/helpers/organisations/accreditation-helpers.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { siteNameOf } from '#server/common/helpers/organisations/site-name.js'
import { fetchOrganisationWasteBalances } from '#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js'
import {
  accreditationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'
import { getStatusClass } from './helpers/status-helpers.js'

/** @import { TypedLogger } from '#server/common/helpers/logging/logger.js' */

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{ organisationNumber: string }} OrganisationParams
 */

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
    accreditation?.status ?? localise('organisations:table:notAccredited')
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
      html: createTag(registration.status)
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
 * Each registration with the year's accreditation, if it is live
 * @param {Record<string, RegistrationView>} registrations
 * @param {Year} selectedYear
 * @returns {DisplayedRegistration[]}
 */
function getDisplayedRegistrations(registrations, selectedYear) {
  return Object.entries(registrations).map(([number, registration]) => {
    const accreditation = registration.accreditations[selectedYear]
    return {
      number,
      registration,
      accreditation: isAccreditationActive(accreditation)
        ? accreditation
        : undefined
    }
  })
}

/**
 * Fetches the year's waste balances. A failure leaves the page without them.
 * @param {OrganisationNumber} orgNumber
 * @param {Year} selectedYear
 * @param {string} backendToken - JWT token
 * @param {TypedLogger} logger - Request logger
 * @returns {Promise<WasteBalanceMap>}
 */
async function getWasteBalanceMap(
  orgNumber,
  selectedYear,
  backendToken,
  logger
) {
  try {
    return await fetchOrganisationWasteBalances(
      orgNumber,
      selectedYear,
      backendToken
    )
  } catch (error) {
    logger.error({ message: 'Failed to fetch waste balances', err: error })
    return {}
  }
}

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
 * The organisation as it stood in its latest approved year. An organisation
 * with no approved year has no registrations to show.
 * @param {OrganisationNumber} orgNumber
 * @param {string} backendToken
 * @param {TypedLogger} logger
 */
async function fetchLatestYear(orgNumber, backendToken, logger) {
  const [selectedYear] = await fetchOrganisationYears(orgNumber, backendToken)

  if (!selectedYear) {
    return {
      organisation: await fetchOrganisation(orgNumber, backendToken),
      selectedYear: null,
      displayedRegistrations: [],
      wasteBalanceMap: {}
    }
  }

  const [organisation, wasteBalanceMap] = await Promise.all([
    fetchOrganisation(orgNumber, backendToken, { year: selectedYear }),
    getWasteBalanceMap(orgNumber, selectedYear, backendToken, logger)
  ])

  return {
    organisation,
    selectedYear,
    displayedRegistrations: getDisplayedRegistrations(
      organisation.registrations,
      selectedYear
    ),
    wasteBalanceMap
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { t: localise } = request
    const orgNumber = organisationNumber(
      Number(request.params.organisationNumber)
    )
    const session = request.auth.credentials

    const isExporterTab = request.path.endsWith('/exporting')
    const activeTab = isExporterTab ? tabTypes.EXPORTER : tabTypes.REPROCESSOR

    const {
      organisation,
      selectedYear,
      displayedRegistrations,
      wasteBalanceMap
    } = await fetchLatestYear(orgNumber, session.backendToken, request.logger)

    const reprocessorSites = getRegistrationSites(
      request,
      orgNumber,
      displayedRegistrations,
      'reprocessor',
      wasteBalanceMap,
      selectedYear
    )

    const exporterSites = getRegistrationSites(
      request,
      orgNumber,
      displayedRegistrations,
      'exporter',
      wasteBalanceMap,
      selectedYear
    )

    const { sites, tableTitle, shouldRenderTabs } = getActiveSitesAndTitle({
      reprocessorSites,
      exporterSites,
      activeTab,
      localise
    })

    const organisationName =
      organisation.tradingName?.trim() || organisation.name

    return h.view('organisations/index', {
      pageTitle: localise('organisations:pageTitle', {
        name: organisationName
      }),
      organisationName,
      activeTab,
      reprocessorUrl: request.localiseUrl(`/organisations/${orgNumber}`),
      exporterUrl: request.localiseUrl(`/organisations/${orgNumber}/exporting`),
      shouldRenderTabs,
      selectedYear: config.get('featureFlags.navigateAcrossYears')
        ? selectedYear
        : null,
      sites,
      tableTitle,
      tabTypes
    })
  }
}
