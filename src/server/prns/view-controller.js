import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchPackagingRecyclingNote } from '#server/common/helpers/packaging-recycling-notes/fetch-packaging-recycling-note.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const viewController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, prnId } = request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Check for session data first (success case after creating a PRN)
    const prnCreated = request.yar.get('prnCreated')

    if (prnCreated && prnCreated.id === prnId) {
      // Clear the session data
      request.yar.clear('prnCreated')

      const noteType =
        prnCreated.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

      return h.view('prns/success', {
        pageTitle: localise(`prns:${noteType}:successPageTitle`),
        heading: localise(`prns:${noteType}:successHeading`),
        tonnageLabel: localise(`prns:${noteType}:successTonnageLabel`),
        tonnage: prnCreated.tonnage,
        tonnageSuffix: localise('prns:tonnageSuffix'),
        nextStepsHeading: localise('prns:successNextStepsHeading'),
        nextStepsText: localise(`prns:${noteType}:successNextStepsText`),
        returnLink: localise('prns:successReturnLink'),
        organisationId,
        registrationId
      })
    }

    // Fetch PRN and registration data from backend
    const [{ organisationData, registration, accreditation }, prn] =
      await Promise.all([
        getRegistrationWithAccreditation(
          organisationId,
          registrationId,
          session.idToken
        ),
        fetchPackagingRecyclingNote(
          organisationId,
          registrationId,
          prnId,
          session.idToken
        )
      ])

    if (!registration) {
      throw Boom.notFound('Registration not found')
    }

    const isExporter = registration.wasteProcessingType === 'exporter'
    const noteType = isExporter ? 'perns' : 'prns'

    const backUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes`
    )

    const displayMaterial = getDisplayMaterial(registration)

    const prnDetailRows = buildPrnDetailRows({
      prn,
      organisationData,
      localise
    })

    const accreditationRows = buildAccreditationRows({
      registration,
      accreditation,
      displayMaterial,
      localise
    })

    const statusConfig = getStatusConfig(prn.status, localise)

    return h.view('prns/check', {
      pageTitle: `${isExporter ? 'PERN' : 'PRN'} ${prn.id}`,
      caption: isExporter ? 'PERN' : 'PRN',
      heading: prn.id,
      status: {
        label: localise('prns:view:status'),
        text: statusConfig.text,
        class: statusConfig.class
      },
      prnDetailsHeading: localise(
        isExporter ? 'prns:pernDetailsHeading' : 'prns:prnDetailsHeading'
      ),
      prnDetailRows,
      accreditationDetailsHeading: localise('prns:accreditationDetailsHeading'),
      accreditationRows,
      backUrl,
      returnLink: {
        href: request.localiseUrl(
          `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes`
        ),
        text: localise(`prns:view:${noteType}:returnLink`)
      }
    })
  }
}

/**
 * Formats an address object into a single line string
 * @param {object} address - Address object with line1, line2, town, postcode etc
 * @returns {string} Formatted address string
 */
function formatAddress(address) {
  if (!address) {
    return ''
  }

  const parts = [
    address.line1,
    address.line2,
    address.town,
    address.postcode
  ].filter(Boolean)

  return parts.join(', ')
}

/**
 * Builds the PRN/PERN details rows for the summary list (for viewing existing PRN)
 * @param {object} params
 * @param {object} params.prn - PRN data from backend
 * @param {object} params.organisationData - Organisation data
 * @param {(key: string) => string} params.localise - Translation function
 * @returns {Array} Summary list rows
 */
function buildPrnDetailRows({ prn, organisationData, localise }) {
  return [
    {
      key: { text: localise('prns:issuedByLabel') },
      value: {
        text:
          organisationData?.companyDetails?.name ||
          localise('prns:notAvailable')
      }
    },
    {
      key: { text: localise('prns:issuedToLabel') },
      value: { text: prn.issuedToOrganisation }
    },
    {
      key: { text: localise('prns:tonnageLabel') },
      value: { text: String(prn.tonnage) }
    },
    {
      key: { text: localise('prns:tonnageInWordsLabel') },
      value: { text: prn.tonnageInWords || '' }
    },
    {
      key: { text: localise('prns:processToBeUsedLabel') },
      value: { text: prn.processToBeUsed || '' }
    },
    {
      key: { text: localise('prns:decemberWasteLabel') },
      value: {
        text: prn.isDecemberWaste
          ? localise('prns:decemberWasteYes')
          : localise('prns:decemberWasteNo')
      }
    },
    {
      key: { text: localise('prns:issueCommentsLabel') },
      value: { text: prn.notes || localise('prns:notProvided') }
    },
    {
      key: { text: localise('prns:issuedDateLabel') },
      value: { text: prn.authorisedAt ? formatDate(prn.authorisedAt) : '' }
    },
    {
      key: { text: localise('prns:authorisedByLabel') },
      value: { text: prn.authorisedBy?.name || '' }
    },
    {
      key: { text: localise('prns:positionLabel') },
      value: { text: prn.authorisedBy?.position || '' }
    }
  ]
}

/**
 * Builds the accreditation details rows for the summary list
 * @param {object} params
 * @param {object} params.registration - Registration data
 * @param {object} params.accreditation - Accreditation data
 * @param {string} params.displayMaterial - Formatted material name
 * @param {(key: string) => string} params.localise - Translation function
 * @returns {Array} Summary list rows
 */
function buildAccreditationRows({
  registration,
  accreditation,
  displayMaterial,
  localise
}) {
  return [
    {
      key: { text: localise('prns:materialLabel') },
      value: { text: displayMaterial }
    },
    {
      key: { text: localise('prns:accreditationNumberLabel') },
      value: { text: accreditation?.accreditationNumber || '' }
    },
    {
      key: { text: localise('prns:accreditationAddressLabel') },
      value: { text: formatAddress(registration.site?.address) }
    }
  ]
}

/**
 * Get status display configuration
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {{text: string, class: string}}
 */
function getStatusConfig(status, localise) {
  const statusMap = {
    awaiting_authorisation: {
      text: localise('prns:list:status:awaitingAuthorisation'),
      class: 'govuk-tag--yellow'
    },
    issued: {
      text: localise('prns:list:status:issued'),
      class: 'govuk-tag--green'
    },
    cancelled: {
      text: localise('prns:list:status:cancelled'),
      class: 'govuk-tag--red'
    }
  }

  return statusMap[status] ?? { text: status, class: '' }
}

/**
 * Format date for display
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
