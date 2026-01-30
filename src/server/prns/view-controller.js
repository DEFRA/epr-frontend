import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchPackagingRecyclingNote } from '#server/common/helpers/packaging-recycling-notes/fetch-packaging-recycling-note.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

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

    // Check for draft PRN data in session (creation flow)
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft && prnDraft.id === prnId) {
      // Creation flow - show check page with draft data
      return handleDraftView(request, h, {
        organisationId,
        registrationId,
        prnDraft,
        localise,
        session
      })
    }

    // View existing PRN - fetch from backend
    return handleExistingView(request, h, {
      organisationId,
      registrationId,
      prnId,
      localise,
      session
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const viewPostController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, prnId } = request.params
    const session = request.auth.credentials

    // Retrieve draft PRN data from session
    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft || prnDraft.id !== prnId) {
      // No draft in session or ID mismatch - redirect to create page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/create`
      )
    }

    try {
      // Update PRN status from draft to awaiting_authorisation
      const result = await updatePrnStatus(
        organisationId,
        registrationId,
        prnId,
        { status: 'awaiting_authorisation' },
        session.idToken
      )

      // Clear draft and store for created page
      request.yar.clear('prnDraft')
      request.yar.set('prnCreated', {
        id: result.id,
        tonnage: result.tonnage,
        material: result.material,
        status: result.status,
        wasteProcessingType: prnDraft.wasteProcessingType
      })

      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prnId}/created`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to update PRN status')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to confirm PRN')
    }
  }
}

/**
 * Handle viewing a draft PRN (creation flow)
 * @param {object} _request
 * @param {object} h
 * @param {object} params
 * @param {string} params.organisationId
 * @param {string} params.registrationId
 * @param {object} params.prnDraft
 * @param {(key: string) => string} params.localise
 * @param {object} params.session
 */
async function handleDraftView(
  _request,
  h,
  { organisationId, registrationId, prnDraft, localise, session }
) {
  const { organisationData, registration, accreditation } =
    await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

  const isExporter = registration.wasteProcessingType === 'exporter'
  const noteType = isExporter ? 'perns' : 'prns'

  const displayMaterial = getDisplayMaterial(registration)

  const prnDetailRows = buildDraftPrnDetailRows({
    prnDraft,
    organisationData,
    localise
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise
  })

  return h.view('prns/view', {
    pageTitle: localise(`prns:${noteType}:checkPageTitle`),
    caption: localise(`prns:${noteType}:caption`),
    heading: localise(`prns:${noteType}:checkHeading`),
    introText: localise(`prns:${noteType}:checkIntroText`),
    authorisationText: localise(`prns:${noteType}:checkAuthorisationText`),
    insetText: localise(`prns:${noteType}:checkInsetText`),
    prnDetailsHeading: localise(
      isExporter ? 'prns:pernDetailsHeading' : 'prns:prnDetailsHeading'
    ),
    prnDetailRows,
    accreditationDetailsHeading: localise('prns:accreditationDetailsHeading'),
    accreditationRows,
    createButton: {
      text: localise(`prns:${noteType}:createButton`)
    },
    cancelButton: {
      text: localise(`prns:${noteType}:cancelButton`),
      href: `/organisations/${organisationId}/registrations/${registrationId}`
    },
    organisationId,
    registrationId
  })
}

/**
 * Handle viewing an existing PRN (from backend)
 * @param {object} request
 * @param {object} h
 * @param {object} params
 * @param {string} params.organisationId
 * @param {string} params.registrationId
 * @param {string} params.prnId
 * @param {(key: string) => string} params.localise
 * @param {object} params.session
 */
async function handleExistingView(
  request,
  h,
  { organisationId, registrationId, prnId, localise, session }
) {
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

  const statusConfig = getStatusConfig(prn.status, localise)
  const isNotDraft = prn.status !== 'draft'

  const prnDetailRows = buildExistingPrnDetailRows({
    prn,
    organisationData,
    localise,
    isExporter,
    statusConfig,
    isNotDraft
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise
  })

  return h.view('prns/view', {
    pageTitle: `${isExporter ? 'PERN' : 'PRN'} ${prn.id}`,
    caption: isNotDraft ? prn.id : isExporter ? 'PERN' : 'PRN',
    heading: isExporter ? 'PERN' : 'PRN',
    showRegulatorLogos: isNotDraft,
    complianceYearText:
      isNotDraft && prn.accreditationYear != null
        ? localise(`prns:view:${noteType}:complianceYearText`, {
            year: `<strong>${prn.accreditationYear}</strong>`
          })
        : null,
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
 * Builds the PRN/PERN details rows for a draft PRN (creation flow)
 * @param {object} params
 * @param {object} params.prnDraft - Draft PRN data from session
 * @param {object} params.organisationData - Organisation data
 * @param {(key: string) => string} params.localise - Translation function
 * @returns {Array} Summary list rows
 */
function buildDraftPrnDetailRows({ prnDraft, organisationData, localise }) {
  return [
    {
      key: { text: localise('prns:issuedByLabel') },
      value: {
        text:
          organisationData.companyDetails?.name || localise('prns:notAvailable')
      }
    },
    {
      key: { text: localise('prns:issuedToLabel') },
      value: { text: prnDraft.recipientName }
    },
    {
      key: { text: localise('prns:tonnageLabel') },
      value: { text: prnDraft.tonnage }
    },
    {
      key: { text: localise('prns:tonnageInWordsLabel') },
      value: { text: prnDraft.tonnageInWords || '' }
    },
    {
      key: { text: localise('prns:processToBeUsedLabel') },
      value: { text: prnDraft.processToBeUsed || '' }
    },
    {
      key: { text: localise('prns:decemberWasteLabel') },
      value: {
        text: prnDraft.isDecemberWaste
          ? localise('prns:decemberWasteYes')
          : localise('prns:decemberWasteNo')
      }
    },
    {
      key: { text: localise('prns:issueCommentsLabel') },
      value: { text: prnDraft.notes || localise('prns:notProvided') }
    },
    {
      key: { text: localise('prns:issuedDateLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('prns:authorisedByLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('prns:positionLabel') },
      value: { text: '' }
    }
  ]
}

/**
 * Builds the PRN/PERN details rows for an existing PRN (from backend)
 * @param {object} params
 * @param {object} params.prn - PRN data from backend
 * @param {object} params.organisationData - Organisation data
 * @param {(key: string) => string} params.localise - Translation function
 * @param {boolean} params.isExporter - Whether the registration is for an exporter
 * @param {{text: string, class: string}} params.statusConfig - Status display config
 * @param {boolean} params.isNotDraft - Whether the PRN is not a draft
 * @returns {Array} Summary list rows
 */
function buildExistingPrnDetailRows({
  prn,
  organisationData,
  localise,
  isExporter,
  statusConfig,
  isNotDraft
}) {
  const rows = [
    {
      key: {
        text: localise(
          isExporter ? 'prns:pernNumberLabel' : 'prns:prnNumberLabel'
        )
      },
      value: { text: '' }
    }
  ]

  if (isNotDraft) {
    rows.push({
      key: { text: localise('prns:view:status') },
      value: {
        html: `<strong class="govuk-tag ${statusConfig.class}">${statusConfig.text}</strong>`
      }
    })
  }

  rows.push(
    {
      key: { text: localise('prns:buyerLabel') },
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
      key: { text: localise('prns:issuedDateLabel') },
      value: { text: prn.authorisedAt ? formatDate(prn.authorisedAt) : '' }
    },
    {
      key: { text: localise('prns:issuedByLabel') },
      value: {
        text:
          organisationData?.companyDetails?.name ||
          localise('prns:notAvailable')
      }
    },
    {
      key: { text: localise('prns:authorisedByLabel') },
      value: { text: prn.authorisedBy?.name || '' }
    },
    {
      key: { text: localise('prns:positionLabel') },
      value: { text: prn.authorisedBy?.position || '' }
    },
    {
      key: { text: localise('prns:issuerNotesLabel') },
      value: { text: prn.notes || localise('prns:notProvided') }
    }
  )

  return rows
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
      class: 'govuk-tag--blue epr-tag--no-max-width'
    },
    issued: {
      text: localise('prns:list:status:issued'),
      class: 'govuk-tag--blue epr-tag--no-max-width'
    },
    cancelled: {
      text: localise('prns:list:status:cancelled'),
      class: 'govuk-tag--grey epr-tag--no-max-width'
    }
  }

  return statusMap[status] ?? { text: status, class: 'epr-tag--no-max-width' }
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
