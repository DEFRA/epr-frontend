import { capitalize } from 'lodash-es'

import { getStatusClass } from './helpers/status-helpers.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

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
 * @param {(key: string) => string} localise - Localisation function
 * @param {string} id - Organisation ID
 * @param {object} registration - Registration data
 * @param {accreditation | undefined} accreditation - Accreditation data
 * @returns {[{text: string},{html: string},{html: (string|string)},{html: string, classes: string}]} - Array of table cells
 */
function createRow(localise, id, registration, accreditation) {
  return [
    { text: capitalize(registration.material) },
    {
      html: createTag(registration.status)
    },
    {
      html: createTag(
        accreditation?.status ?? localise('organisations:table:notAccredited')
      )
    },
    {
      html: `<a href="/organisations/${id}/registrations/${registration.id}" class="govuk-link">${localise('organisations:table:site:actions:select')}</a>`,
      classes: 'govuk-!-text-align-right govuk-!-padding-right-2'
    }
  ]
}

/**
 * Organises accreditations by site for a given waste processing type
 * @param {(key: string) => string} localise - Localisation function
 * @param {object} data - The organisation data
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @returns {Array} Array of sites with their materials
 */
function getRegistrationSites(localise, data, wasteProcessingType) {
  const excludedStatuses = new Set(['created', 'rejected'])

  return data.registrations.reduce((prev, registration) => {
    const shouldRender =
      registration.wasteProcessingType === wasteProcessingType &&
      !excludedStatuses.has(registration.status)
    const isExporter = registration.wasteProcessingType === 'exporter'

    if (!shouldRender) {
      return prev
    }

    const accreditation = data.accreditations.find(
      ({ id }) => registration.accreditationId === id
    )

    const existingSite = isExporter
      ? undefined
      : prev.find(({ name }) => name === registration.site?.address?.line1)

    return existingSite
      ? prev.map((site) =>
          site.name === existingSite.name
            ? {
                ...site,
                rows: [
                  ...site.rows,
                  createRow(localise, data.id, registration, accreditation)
                ]
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
              { text: localise('organisations:table:site:headings:materials') },
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
            rows: [createRow(localise, data.id, registration, accreditation)]
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

    const userSession = request.auth?.credentials

    let organisationData = null

    organisationData = await fetchOrganisationById(
      organisationId,
      userSession?.idToken
    )

    const organisationName = organisationData.companyDetails.tradingName

    const reprocessorSites = getRegistrationSites(
      localise,
      organisationData,
      'reprocessor'
    )

    const exporterSites = getRegistrationSites(
      localise,
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
 * @import { ServerRoute } from '@hapi/hapi'
 */
