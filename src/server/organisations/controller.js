import { capitalize } from 'lodash-es'

import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getStatusClass } from './helpers/status-helpers.js'

const EXCLUDED_STATUSES = new Set(['created', 'rejected'])

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
 * @param {Record<string, { amount: number, availableAmount: number }>} wasteBalanceMap - Map of accreditationId to balance data
 * @returns {Array<{text?: string, html?: string, classes?: string}>} - Array of table cells
 */
function createRow(request, id, registration, accreditation, wasteBalanceMap) {
  const { t: localise } = request
  const registrationUrl = request.localiseUrl(
    `/organisations/${id}/registrations/${registration.id}`
  )

  const accreditationId = registration.accreditationId
  const wasteBalance = wasteBalanceMap?.[accreditationId]

  return [
    { text: getDisplayMaterial(registration) },
    {
      html: createTag(registration.status)
    },
    {
      html: createTag(
        accreditation?.status ?? localise('organisations:table:notAccredited')
      )
    },
    {
      text: formatTonnage(wasteBalance?.availableAmount)
    },
    {
      html: `<a href="${registrationUrl}" class="govuk-link">${localise('organisations:table:site:actions:select')}</a>`,
      classes: 'govuk-!-text-align-right govuk-!-padding-right-2'
    }
  ]
}

/**
 * Organises registrations by site for a given waste processing type
 * @param {Request} request
 * @param {string} organisationId - The organisation ID
 * @param {Array<{registration: object, accreditation: object | undefined}>} registrationsWithAccreditations - Pre-joined registration and accreditation data
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @param {Record<string, { amount: number, availableAmount: number }>} wasteBalanceMap - Map of accreditationId to balance data
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

  return filtered.reduce((prev, { registration, accreditation }) => {
    const isExporter = registration.wasteProcessingType === 'exporter'

    const existingSite = isExporter
      ? undefined
      : prev.find(({ name }) => name === registration.site?.address?.line1)

    const row = createRow(
      request,
      organisationId,
      registration,
      accreditation,
      wasteBalanceMap
    )

    return existingSite
      ? prev.map((site) =>
          site.name === existingSite.name
            ? {
                ...site,
                rows: [...site.rows, row]
              }
            : site
        )
      : [
          ...prev,
          {
            name: isExporter
              ? null
              : (registration.site?.address?.line1 ??
                localise('organisations:table:site:unknown')),
            head: [
              {
                text: localise('organisations:table:site:headings:materials')
              },
              {
                text: localise(
                  'organisations:table:site:headings:registrationStatuses'
                )
              },
              {
                text: localise(
                  'organisations:table:site:headings:accreditationStatuses'
                )
              },
              {
                text: localise(
                  'organisations:table:site:headings:availableBalance'
                )
              },
              { text: '' }
            ],
            rows: [row]
          }
        ]
  }, [])
}

const tabTypes = Object.freeze({
  EXPORTER: 'EXPORTER',
  REPROCESSOR: 'REPROCESSOR'
})

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { t: localise } = request
    const { organisationId } = request.params

    const isExporterTab = request.path.endsWith('/exporting')
    const activeTab = isExporterTab ? tabTypes.EXPORTER : tabTypes.REPROCESSOR

    const session = request.auth.credentials

    const organisationData = await fetchOrganisationById(
      organisationId,
      session.idToken
    )

    const organisationName = organisationData.companyDetails.tradingName

    const accreditationById = new Map(
      organisationData.accreditations.map((acc) => [acc.id, acc])
    )

    const displayableRegistrations = organisationData.registrations
      .map((registration) => ({
        registration,
        accreditation: accreditationById.get(registration.accreditationId)
      }))
      .filter(
        ({ registration, accreditation }) =>
          shouldRenderSite(registration, accreditation, 'reprocessor') ||
          shouldRenderSite(registration, accreditation, 'exporter')
      )

    const uniqueAccreditationIds = [
      ...new Set(
        displayableRegistrations
          .map(({ registration }) => registration.accreditationId)
          .filter(Boolean)
      )
    ]

    let wasteBalanceMap = {}
    if (uniqueAccreditationIds.length > 0) {
      try {
        wasteBalanceMap = await fetchWasteBalances(
          uniqueAccreditationIds,
          session.idToken
        )
      } catch (error) {
        request.logger.error({ error }, 'Failed to fetch waste balances')
      }
    }

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

    const hasReprocessorSites = reprocessorSites.length > 0
    const hasExporterSites = exporterSites.length > 0
    const shouldRenderTabs = hasReprocessorSites && hasExporterSites
    let sites = []
    let tableTitle = ''

    if (
      (!shouldRenderTabs && hasReprocessorSites) ||
      (shouldRenderTabs && activeTab === tabTypes.REPROCESSOR)
    ) {
      sites = reprocessorSites
      tableTitle = localise('organisations:table:titleReprocessor')
    }

    if (
      (!shouldRenderTabs && hasExporterSites) ||
      (shouldRenderTabs && activeTab === tabTypes.EXPORTER)
    ) {
      sites = exporterSites
      tableTitle = localise('organisations:table:titleExporter')
    }

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

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
