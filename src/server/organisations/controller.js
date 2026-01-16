import { capitalize } from 'lodash-es'

import { formatMaterialName } from '#server/common/helpers/materials/format-material-name.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
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
 * @returns {[{text: string},{html: string},{html: (string|string)},{html: string, classes: string}]} - Array of table cells
 */
function createRow(request, id, registration, accreditation) {
  const { t: localise } = request
  const registrationUrl = request.localiseUrl(
    `/organisations/${id}/registrations/${registration.id}`
  )

  return [
    { text: formatMaterialName(registration.material) },
    {
      html: createTag(registration.status)
    },
    {
      html: createTag(
        accreditation?.status ?? localise('organisations:table:notAccredited')
      )
    },
    {
      html: `<a href="${registrationUrl}" class="govuk-link">${localise('organisations:table:site:actions:select')}</a>`,
      classes: 'govuk-!-text-align-right govuk-!-padding-right-2'
    }
  ]
}

/**
 * Organises accreditations by site for a given waste processing type
 * @param {Request} request
 * @param {object} data - The organisation data
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @returns {Array} Array of sites with their materials
 */
function getRegistrationSites(request, data, wasteProcessingType) {
  const { t: localise } = request

  return data.registrations.reduce((prev, registration) => {
    const accreditation = data.accreditations.find(
      ({ id }) => registration.accreditationId === id
    )

    if (!shouldRenderSite(registration, accreditation, wasteProcessingType)) {
      return prev
    }

    const isExporter = registration.wasteProcessingType === 'exporter'

    const existingSite = isExporter
      ? undefined
      : prev.find(({ name }) => name === registration.site?.address?.line1)

    const row = createRow(request, data.id, registration, accreditation)

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

    const reprocessorSites = getRegistrationSites(
      request,
      organisationData,
      'reprocessor'
    )

    const exporterSites = getRegistrationSites(
      request,
      organisationData,
      'exporter'
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
