import { getStatusClass, getCurrentStatus } from './helpers/status-helpers.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { err } from '#server/common/helpers/result.js'

/**
 * Organizes accreditations by site for a given waste processing type
 * @param {object} data - The organisation data
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @returns {Array} Array of sites with their materials
 */
function organiseAccreditationsBySite(data, wasteProcessingType) {
  const EXCLUDED_STATUSES = ['created', 'rejected']

  const filteredAccreditations = data.accreditations.filter(
    (acc) => acc.wasteProcessingType === wasteProcessingType
  )

  const siteMap = new Map()

  filteredAccreditations.forEach((accreditation) => {
    const registration = data.registrations.find(
      (reg) => reg.accreditationId === accreditation.id
    )

    const registrationStatus = getCurrentStatus(
      registration?.statusHistory || accreditation.statusHistory
    )
    const accreditationStatus = getCurrentStatus(accreditation.statusHistory)

    if (
      EXCLUDED_STATUSES.includes(registrationStatus.toLowerCase()) ||
      EXCLUDED_STATUSES.includes(accreditationStatus.toLowerCase())
    ) {
      return
    }

    let siteName
    if (accreditation.site?.address?.line1) {
      siteName = accreditation.site.address.line1
    } else if (registration?.site?.address?.line1) {
      siteName = registration.site.address.line1
    } else {
      siteName = 'Unknown site'
    }

    if (!siteMap.has(siteName)) {
      siteMap.set(siteName, {
        name: siteName,
        tableRows: []
      })
    }

    const material =
      accreditation.material.charAt(0).toUpperCase() +
      accreditation.material.slice(1)

    siteMap.get(siteName).tableRows.push([
      { text: material },
      {
        html: `<strong class="govuk-tag govuk-tag--${getStatusClass(registrationStatus)}">${registrationStatus}</strong>`
      },
      {
        html: `<strong class="govuk-tag govuk-tag--${getStatusClass(accreditationStatus)}">${accreditationStatus}</strong>`
      },
      {
        html: `<a href="/organisations/${data.id}/accreditations/${accreditation.id}" class="govuk-link">Select</a>`
      }
    ])
  })

  return Array.from(siteMap.values())
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { t: localise } = request
    const { id: organisationId } = request.params

    const isExportingTab = request.path.endsWith('/exporting')
    const activeTab = isExportingTab ? 'exporting' : 'reprocessing'

    const { ok, value: session } = await getUserSession(request)
    const userSession = ok && session ? session : request.auth?.credentials

    request.logger.info(
      {
        organisationId,
        hasSession: ok,
        hasIdToken: !!userSession?.idToken
      },
      'Organisation page accessed'
    )

    let organisationData = null

    try {
      organisationData = await fetchOrganisationById(
        organisationId,
        userSession?.idToken
      )
    } catch (error) {
      return err({
        message: 'Failed to fetch organisation from backend',
        cause: error
      })
    }

    const organisationName = organisationData.companyDetails.tradingName

    const reprocessingSites = organiseAccreditationsBySite(
      organisationData,
      'reprocessor'
    )
    const exportingSites = organiseAccreditationsBySite(
      organisationData,
      'exporter'
    )

    return h.view('organisations/index', {
      pageTitle: localise('organisations:pageTitle'),
      organisationName,
      organisationId,
      activeTab,
      reprocessingUrl: request.localiseUrl(`/organisations/${organisationId}`),
      exportingUrl: request.localiseUrl(
        `/organisations/${organisationId}/exporting`
      ),
      sites: activeTab === 'reprocessing' ? reprocessingSites : exportingSites,
      hasReprocessing: reprocessingSites.length > 0,
      hasExporting: exportingSites.length > 0
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
