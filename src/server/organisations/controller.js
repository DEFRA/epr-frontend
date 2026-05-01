import { capitalize } from 'lodash-es'

import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getStatusClass } from './helpers/status-helpers.js'

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 */

/**
 * @typedef {{ organisationId: string }} OrganisationParams
 */

/**
 * @typedef {{ text: string, classes?: string, format?: string } | { html: string, classes?: string }} TableCell
 */

const EXCLUDED_STATUSES = new Set(['created', 'rejected'])

/**
 * @param {string} [status]
 * @returns {boolean}
 */
const isExcludedStatus = (status) => !status || EXCLUDED_STATUSES.has(status)

/**
 * @param {Accreditation | undefined} accreditation
 * @returns {boolean}
 */
const excludeAccreditation = (accreditation) =>
  accreditation !== undefined && isExcludedStatus(accreditation.status)

/**
 * Determines whether a site should be rendered based on its registration
 * and accreditation statuses
 * @param {Registration} registration - Registration data
 * @param {Accreditation | undefined} accreditation - Accreditation data (may be absent)
 * @param {string} wasteProcessingType - The waste processing type to filter by
 * @returns {boolean} Whether the site should be rendered
 */
function shouldRenderSite(registration, accreditation, wasteProcessingType) {
  const isCorrectWasteProcessingType =
    registration.wasteProcessingType === wasteProcessingType

  const isRegistrationExcluded = isExcludedStatus(registration.status)
  const isAccreditationExcluded = excludeAccreditation(accreditation)

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
 * @param {Accreditation | undefined} accreditation
 * @param {{ availableAmount?: number } | undefined} wasteBalance
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const formatWasteBalance = (accreditation, wasteBalance, localise) =>
  accreditation
    ? formatTonnage(wasteBalance?.availableAmount)
    : localise('organisations:table:notApplicable')

/**
 * @param {Accreditation | undefined} accreditation
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const createAccreditationTag = (accreditation, localise) =>
  createTag(
    accreditation?.status ?? localise('organisations:table:notAccredited')
  )

/**
 * Creates a row for a given registration
 * @param {HapiRequest} request
 * @param {string} id - Organisation ID
 * @param {Registration} registration - Registration data
 * @param {Accreditation | undefined} accreditation - Accreditation data (may be absent)
 * @param {WasteBalanceMap} wasteBalanceMap - Map of accreditationId to balance data
 * @returns {TableCell[]} - Array of table cells
 */
function createRow(request, id, registration, accreditation, wasteBalanceMap) {
  const { t: localise } = request
  const registrationUrl = request.localiseUrl(
    `/organisations/${id}/registrations/${registration.id}`
  )

  const accreditationId = registration.accreditationId
  const wasteBalance = accreditationId
    ? wasteBalanceMap?.[accreditationId]
    : undefined

  /** @type {TableCell[]} */
  const cells = [
    {
      text: getDisplayMaterial(registration),
      classes: 'govuk-!-width-one-quarter'
    },
    {
      html: createTag(registration.status)
    },
    {
      html: createAccreditationTag(accreditation, localise)
    },
    {
      text: formatWasteBalance(accreditation, wasteBalance, localise),
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
 * Gets the site name for a registration
 * @param {object} registration - Registration data
 * @param {(key: string) => string} localise - Translation function
 * @returns {string | null} Site name or null for exporters
 */
function getSiteName(registration, localise) {
  if (isExporterRegistration(registration)) {
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
 * @param {string} organisationId - The organisation ID
 * @param {Array<{registration: Registration, accreditation: Accreditation | undefined}>} registrationsWithAccreditations - Pre-joined registration and accreditation data
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
 * @param {import('#server/common/helpers/logging/logger.js').TypedLogger} logger - Request logger
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

export const controller = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
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

    const wasteBalanceMap = await getWasteBalanceMap(
      organisationId,
      displayableRegistrations,
      session.idToken,
      request.logger
    )

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

    const organisationName =
      organisationData.companyDetails.tradingName?.trim() ||
      organisationData.companyDetails.name

    return h.view('organisations/index', {
      pageTitle: localise('organisations:pageTitle', {
        name: organisationName
      }),
      organisationName,
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
