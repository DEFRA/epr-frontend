import fixtureData from './fixture.json' with { type: 'json' }
import {
  getStatusClass,
  getCurrentStatus
} from './helpers/status-helpers.js'

/**
 * Organizes accreditations by site for a given waste processing type
 * @param {Object} data - The fixture data
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
  handler({ t: localise }, h) {
    const organisationData = fixtureData

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

    return h.view('account/index', {
      pageTitle: localise('account:pageTitle'),
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
