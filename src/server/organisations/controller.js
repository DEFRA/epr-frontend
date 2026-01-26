import { capitalize } from 'lodash-es'

import { config } from '#config/config.js'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getStatusClass } from './helpers/status-helpers.js'

const EXCLUDED_STATUSES = new Set(['created', 'rejected'])
const FEATURE_FLAG_NAME_WASTE_BALANCE = 'featureFlags.wasteBalance'

/**
 * Determines whether a site should be rendered based on its registration
 * and accreditation statuses
 * @param {object} registration - Registration data
 * @param {object | undefined} accreditation - Accreditation data
 * @param {string} wasteProcessingType - The waste processing type to filter by
 * @returns {boolean} Whether the site should be rendered
 */
function shouldRenderSite(registration, accreditation, wasteProcessingType) {
  const isExcludedStatus = (status) => !status || EXCLUDED_STATUSES.has(status)

  const isCorrectWasteProcessingType =
    registration.wasteProcessingType === wasteProcessingType

  const isRegistrationExcluded = isExcludedStatus(registration.status)
  const isAccreditationExcluded =
    accreditation && isExcludedStatus(accreditation.status)

  return (
    isCorrectWasteProcessingType &&
    !isRegistrationExcluded &&
    !isAccreditationExcluded
  )
}

/**
 *
 * @param {string} status
 * @returns {string}
 */
function createTag(status) {
  return `<strong class="govuk-tag govuk-tag--${getStatusClass(status)}">${capitalize(status)}</strong>`
}

/**
 * Creates a row for a given registration
 * @param {Request} request
 * @param {string} id - Organisation ID
 * @param {object} registration - Registration data
 * @param {object | undefined} accreditation - Accreditation data
 * @param {WasteBalanceMap} wasteBalanceMap - Map of accreditationId to balance data
 * @returns {Array<{text?: string, html?: string, classes?: string}>} - Array of table cells
 */
function createRow(request, id, registration, accreditation, wasteBalanceMap) {
  const { t: localise } = request
  const registrationUrl = request.localiseUrl(
    `/organisations/${id}/registrations/${registration.id}`
  )

  const accreditationId = registration.accreditationId
  const wasteBalance = wasteBalanceMap?.[accreditationId]

  const cells = [
    { text: getDisplayMaterial(registration) },
    {
      html: createTag(registration.status)
    },
    {
      html: createTag(
        accreditation?.status ?? localise('organisations:table:notAccredited')
      )
    }
  ]

  if (config.get(FEATURE_FLAG_NAME_WASTE_BALANCE)) {
    cells.push({
      text: formatTonnage(wasteBalance?.availableAmount),
      format: 'numeric'
    })
  }

  cells.push({
    html: `<a href="${registrationUrl}" class="govuk-link">${localise('organisations:table:site:actions:select')}</a>`,
    classes: 'govuk-!-text-align-right govuk-!-padding-right-2'
  })

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

  if (config.get(FEATURE_FLAG_NAME_WASTE_BALANCE)) {
    headers.push({
      text: localise('organisations:table:site:headings:availableBalance'),
      format: 'numeric'
    })
  }

  headers.push({ text: '' })

  return headers
}

/**
 * Gets the site name for a registration
 * @param {object} registration - Registration data
 * @param {(key: string) => string} localise - Translation function
 * @returns {string | null} Site name or null for exporters
 */
function getSiteName(registration, localise) {
  if (registration.wasteProcessingType === 'exporter') {
    return null
  }
  return (
    registration.site?.address?.line1 ??
    localise('organisations:table:site:unknown')
  )
}

/**
 * Adds a row to an existing site or creates a new site entry
 * @param {Array} sites - Current sites array
 * @param {object} registration - Registration data
 * @param {Array} row - Row data to add
 * @param {(key: string) => string} localise - Translation function
 * @returns {Array} Updated sites array
 */
function addRowToSites(sites, registration, row, localise) {
  const siteName = getSiteName(registration, localise)
  const existingSite =
    siteName !== null ? sites.find(({ name }) => name === siteName) : undefined

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
 * @param {Request} request
 * @param {string} organisationId - The organisation ID
 * @param {Array<{registration: object, accreditation: object | undefined}>} registrationsWithAccreditations - Pre-joined registration and accreditation data
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @param {WasteBalanceMap} wasteBalanceMap - Map of accreditationId to balance data
 * @returns {Array} Array of sites with their materials
 */
function getRegistrationSites(
  request,
  organisationId,
  registrationsWithAccreditations,
  wasteProcessingType,
  wasteBalanceMap
) {
  const { t: localise } = request

  const filtered = registrationsWithAccreditations.filter(
    ({ registration }) =>
      registration.wasteProcessingType === wasteProcessingType
  )

  return filtered.reduce((sites, { registration, accreditation }) => {
    const row = createRow(
      request,
      organisationId,
      registration,
      accreditation,
      wasteBalanceMap
    )
    return addRowToSites(sites, registration, row, localise)
  }, [])
}

const tabTypes = Object.freeze({
  EXPORTER: 'EXPORTER',
  REPROCESSOR: 'REPROCESSOR'
})

/**
 * Filters registrations that should be displayed and joins with accreditations
 * @param {object} organisationData - Organisation data from backend
 * @returns {Array<{registration: object, accreditation: object | undefined}>}
 */
function getDisplayableRegistrations(organisationData) {
  const accreditationById = new Map(
    organisationData.accreditations.map((acc) => [acc.id, acc])
  )

  return organisationData.registrations
    .map((registration) => ({
      registration,
      accreditation: accreditationById.get(registration.accreditationId)
    }))
    .filter(
      ({ registration, accreditation }) =>
        shouldRenderSite(registration, accreditation, 'reprocessor') ||
        shouldRenderSite(registration, accreditation, 'exporter')
    )
}

/**
 * Fetches waste balances for displayable registrations
 * @param {string} organisationId - Organisation ID
 * @param {Array<{registration: object}>} displayableRegistrations - Filtered registrations
 * @param {string} idToken - JWT token
 * @param {object} logger - Request logger
 * @returns {Promise<WasteBalanceMap>}
 */
async function getWasteBalanceMap(
  organisationId,
  displayableRegistrations,
  idToken,
  logger
) {
  if (displayableRegistrations.length === 0) {
    return {}
  }

  const accreditationIds = displayableRegistrations
    .map(({ registration }) => registration.accreditationId)
    .filter(Boolean)

  try {
    return await fetchWasteBalances(organisationId, accreditationIds, idToken)
  } catch (error) {
    logger.error({ error }, 'Failed to fetch waste balances')
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
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { t: localise } = request
    const { organisationId } = request.params
    const session = request.auth.credentials

    const isExporterTab = request.path.endsWith('/exporting')
    const activeTab = isExporterTab ? tabTypes.EXPORTER : tabTypes.REPROCESSOR

    const organisationData = await fetchOrganisationById(
      organisationId,
      session.idToken
    )

    const displayableRegistrations =
      getDisplayableRegistrations(organisationData)

    const wasteBalanceMap = config.get(FEATURE_FLAG_NAME_WASTE_BALANCE)
      ? await getWasteBalanceMap(
          organisationId,
          displayableRegistrations,
          session.idToken,
          request.logger
        )
      : {}

    const reprocessorSites = getRegistrationSites(
      request,
      organisationData.id,
      displayableRegistrations,
      'reprocessor',
      wasteBalanceMap
    )

    const exporterSites = getRegistrationSites(
      request,
      organisationData.id,
      displayableRegistrations,
      'exporter',
      wasteBalanceMap
    )

    const { sites, tableTitle, shouldRenderTabs } = getActiveSitesAndTitle({
      reprocessorSites,
      exporterSites,
      activeTab,
      localise
    })

    return h.view('organisations/index', {
      pageTitle: localise('organisations:pageTitle', {
        name: organisationData.companyDetails.tradingName
      }),
      organisationName: organisationData.companyDetails.tradingName,
      organisationId,
      activeTab,
      reprocessorUrl: request.localiseUrl(`/organisations/${organisationId}`),
      exporterUrl: request.localiseUrl(
        `/organisations/${organisationId}/exporting`
      ),
      shouldRenderTabs,
      sites,
      tableTitle,
      tabTypes
    })
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 */
