import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }
import {
  getStatusClass,
  getCurrentStatus
} from './helpers/status-helpers.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * Organizes accreditations by site for a given waste processing type
 * @param {Object} data - The organisation data
 * @param {string} wasteProcessingType - Either 'reprocessor' or 'exporter'
 * @returns {Array} Array of sites with their materials
 */
function organizeAccreditationsBySite(data, wasteProcessingType) {
  // Filter accreditations by waste processing type
  const filteredAccreditations = data.accreditations.filter(
    (acc) => acc.wasteProcessingType === wasteProcessingType
  )

  // Group by site
  const siteMap = new Map()

  filteredAccreditations.forEach((accreditation) => {
    // Find matching registration
    const registration = data.registrations.find(
      (reg) => reg.accreditationId === accreditation.id
    )

    // Get site name from accreditation or fall back to registration
    let siteName = 'Unknown site'
    if (accreditation.site?.address?.line1) {
      siteName = accreditation.site.address.line1
    } else if (registration?.site?.address?.line1) {
      siteName = registration.site.address.line1
    }

    if (!siteMap.has(siteName)) {
      siteMap.set(siteName, {
        name: siteName,
        tableRows: []
      })
    }

    const registrationStatus = getCurrentStatus(
      registration?.statusHistory || accreditation.statusHistory
    )
    const accreditationStatus = getCurrentStatus(accreditation.statusHistory)

    const material =
      accreditation.material.charAt(0).toUpperCase() +
      accreditation.material.slice(1)

    // Add pre-formatted row for govukTable
    siteMap.get(siteName).tableRows.push([
      { text: material },
      {
        html: `<strong class="govuk-tag govuk-tag--${getStatusClass(registrationStatus)}">${registrationStatus}</strong>`
      },
      {
        html: `<strong class="govuk-tag govuk-tag--${getStatusClass(accreditationStatus)}">${accreditationStatus}</strong>`
      },
      { text: '0.00', format: 'numeric' },
      {
        html: `<a href="/organisations/${data.orgId}/accreditations/${accreditation.id}" class="govuk-link">Select</a>`
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

    // Feature flag: set to true to use backend data, false to use fixture
    const USE_BACKEND_DATA = true

    // Get user session
    const { ok, value: session } = await getUserSession(request)
    const userSession = ok && session ? session : request.auth?.credentials

    request.logger.info(
      {
        organisationId,
        hasSession: ok,
        hasIdToken: userSession?.idToken ? true : false
      },
      'Organisation page accessed'
    )

    let backendData = null

    if (USE_BACKEND_DATA) {
      try {
        backendData = await fetchOrganisationById(
          organisationId,
          userSession?.idToken || 'randomstring'
        )
        request.logger.info(
          { backendData },
          'Backend organisation data retrieved'
        )
      } catch (error) {
        request.logger.error(
          {
            error: {
              message: error.message,
              statusCode: error.statusCode,
              response: error.response,
              data: error.data
            }
          },
          'Failed to fetch organisation from backend - falling back to fixture'
        )
      }
    }

    // Use backend data if available, otherwise fall back to fixture
    const organisationData = backendData || fixtureData

    // Extract organisation name
    const organisationName = organisationData.companyDetails.tradingName

    // Organize data for reprocessing and exporting
    const reprocessingSites = organizeAccreditationsBySite(
      organisationData,
      'reprocessor'
    )
    const exportingSites = organizeAccreditationsBySite(
      organisationData,
      'exporter'
    )

    return h.view('organisation/index', {
      pageTitle: localise('organisation:pageTitle'),
      organisationName,
      reprocessingSites,
      exportingSites,
      hasReprocessing: reprocessingSites.length > 0,
      hasExporting: exportingSites.length > 0
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
