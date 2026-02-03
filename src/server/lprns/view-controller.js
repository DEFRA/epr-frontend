import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { formatDateForDisplay } from './helpers/format-date-for-display.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const viewController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Check for draft PRN data in session (creation flow)
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft && prnDraft.id === prnId) {
      // Creation flow - show check page with draft data
      return handleDraftView(request, h, {
        organisationId,
        registrationId,
        accreditationId,
        prnDraft,
        localise,
        session
      })
    }

    // View existing PRN - fetch from backend
    return handleExistingView(request, h, {
      organisationId,
      registrationId,
      accreditationId,
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
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    // Retrieve draft PRN data from session
    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft || prnDraft.id !== prnId) {
      // No draft in session or ID mismatch - redirect to create page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create`
      )
    }

    try {
      // Re-validate tonnage against Available Waste Balance before confirming
      const wasteBalanceMap = await fetchWasteBalances(
        organisationId,
        [accreditationId],
        session.idToken
      )
      const wasteBalance = wasteBalanceMap[accreditationId]
      const availableAmount = wasteBalance?.availableAmount ?? 0

      if (prnDraft.tonnage > availableAmount) {
        // Tonnage exceeds available balance - cancel draft and redirect with error
        request.logger.warn(
          {
            tonnage: prnDraft.tonnage,
            availableAmount,
            prnId
          },
          'PRN tonnage exceeds available waste balance'
        )

        await updatePrnStatus(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'cancelled' },
          session.idToken
        )

        request.yar.clear('prnDraft')

        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create?error=insufficient_balance`
        )
      }

      // Update PRN status from draft to awaiting_authorisation
      const result = await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
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
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/created`
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
 * @param {string} params.accreditationId
 * @param {object} params.prnDraft
 * @param {(key: string) => string} params.localise
 * @param {object} params.session
 */
async function handleDraftView(
  _request,
  h,
  {
    organisationId,
    registrationId,
    accreditationId,
    prnDraft,
    localise,
    session
  }
) {
  const { organisationData, registration, accreditation } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

  const isExporter = registration.wasteProcessingType === 'exporter'
  const noteType = isExporter ? 'perns' : 'prns'

  const displayMaterial = getLumpyDisplayMaterial(registration)

  const prnDetailRows = buildDraftPrnDetailRows({
    prnDraft,
    organisationData,
    localise
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise,
    isExporter
  })

  return h.view('lprns/view', {
    pageTitle: localise(`lprns:${noteType}:checkPageTitle`),
    caption: localise(`lprns:${noteType}:caption`),
    heading: localise(`lprns:${noteType}:checkHeading`),
    introText: localise(`lprns:${noteType}:checkIntroText`),
    authorisationText: localise(`lprns:${noteType}:checkAuthorisationText`),
    insetText: localise(`lprns:${noteType}:checkInsetText`),
    prnDetailsHeading: localise(
      isExporter ? 'lprns:pernDetailsHeading' : 'lprns:prnDetailsHeading'
    ),
    prnDetailRows,
    accreditationDetailsHeading: localise('lprns:accreditationDetailsHeading'),
    accreditationRows,
    createButton: {
      text: localise(`lprns:${noteType}:createButton`)
    },
    discardLink: {
      text: localise(`lprns:${noteType}:discardLink`),
      href: `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create`
    },
    organisationId,
    registrationId,
    accreditationId
  })
}

/**
 * Handle viewing an existing PRN (from backend)
 * @param {object} request
 * @param {object} h
 * @param {object} params
 * @param {string} params.organisationId
 * @param {string} params.registrationId
 * @param {string} params.accreditationId
 * @param {string} params.prnId
 * @param {(key: string) => string} params.localise
 * @param {object} params.session
 */
async function handleExistingView(
  request,
  h,
  { organisationId, registrationId, accreditationId, prnId, localise, session }
) {
  // Fetch PRN and registration data from backend
  const [{ organisationData, registration, accreditation }, prn] =
    await Promise.all([
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      ),
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
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
    `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes`
  )

  const displayMaterial = getLumpyDisplayMaterial(registration)

  const statusConfig = getStatusConfig(prn.status, localise)
  const isNotDraft = prn.status !== 'draft'
  const isAwaitingAuthorisation = prn.status === 'awaiting_authorisation'

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
    localise,
    isExporter
  })

  const viewData = buildExistingPrnViewData({
    prn,
    isExporter,
    noteType,
    isNotDraft,
    isAwaitingAuthorisation,
    prnDetailRows,
    accreditationRows,
    backUrl,
    localise,
    request,
    organisationId,
    registrationId,
    accreditationId,
    prnId
  })

  return h.view('lprns/view', viewData)
}

/**
 * Builds the view data object for an existing PRN
 * @param {object} params
 * @param {object} params.prn - PRN data from backend
 * @param {boolean} params.isExporter - Whether the registration is for an exporter
 * @param {string} params.noteType - 'prns' or 'perns'
 * @param {boolean} params.isNotDraft - Whether the PRN is not a draft
 * @param {boolean} params.isAwaitingAuthorisation - Whether the PRN is awaiting authorisation
 * @param {Array} params.prnDetailRows - PRN detail summary rows
 * @param {Array} params.accreditationRows - Accreditation summary rows
 * @param {string} params.backUrl - Back link URL
 * @param {(key: string, params?: object) => string} params.localise - Translation function
 * @param {object} params.request - Hapi request object
 * @param {string} params.organisationId
 * @param {string} params.registrationId
 * @param {string} params.accreditationId
 * @param {string} params.prnId
 * @returns {object} View data object
 */
function buildExistingPrnViewData({
  prn,
  isExporter,
  noteType,
  isNotDraft,
  isAwaitingAuthorisation,
  prnDetailRows,
  accreditationRows,
  backUrl,
  localise,
  request,
  organisationId,
  registrationId,
  accreditationId,
  prnId
}) {
  const issueUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/issue`
  const returnUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes`

  return {
    pageTitle: `${isExporter ? 'PERN' : 'PRN'} ${prn.id}`,
    heading: isExporter ? 'PERN' : 'PRN',
    showRegulatorLogos: isNotDraft,
    complianceYearText:
      isNotDraft && prn.accreditationYear != null
        ? localise(`lprns:view:${noteType}:complianceYearText`, {
            year: `<strong>${prn.accreditationYear}</strong>`
          })
        : null,
    prnDetailsHeading: localise(
      isExporter ? 'lprns:pernDetailsHeading' : 'lprns:prnDetailsHeading'
    ),
    prnDetailRows,
    accreditationDetailsHeading: localise('lprns:accreditationDetailsHeading'),
    accreditationRows,
    backUrl,
    issueButton: isAwaitingAuthorisation
      ? {
          text: localise(`lprns:view:${noteType}:issueButton`),
          action: request.localiseUrl(issueUrl)
        }
      : null,
    returnLink: {
      href: request.localiseUrl(returnUrl),
      text: localise(`lprns:view:${noteType}:returnLink`)
    }
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
      key: { text: localise('lprns:issuedByLabel') },
      value: {
        text:
          organisationData.companyDetails?.name ||
          localise('lprns:notAvailable')
      }
    },
    {
      key: { text: localise('lprns:issuedToLabel') },
      value: { text: prnDraft.recipientName }
    },
    {
      key: { text: localise('lprns:tonnageLabel') },
      value: { text: prnDraft.tonnage }
    },
    {
      key: { text: localise('lprns:tonnageInWordsLabel') },
      value: { text: prnDraft.tonnageInWords || '' }
    },
    {
      key: { text: localise('lprns:processToBeUsedLabel') },
      value: { text: prnDraft.processToBeUsed || '' }
    },
    {
      key: { text: localise('lprns:decemberWasteLabel') },
      value: {
        text: prnDraft.isDecemberWaste
          ? localise('lprns:decemberWasteYes')
          : localise('lprns:decemberWasteNo')
      }
    },
    {
      key: { text: localise('lprns:issueCommentsLabel') },
      value: { text: prnDraft.notes || localise('lprns:notProvided') }
    },
    {
      key: { text: localise('lprns:issuedDateLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('lprns:authorisedByLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('lprns:positionLabel') },
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
  const numberLabel = isExporter
    ? 'lprns:pernNumberLabel'
    : 'lprns:prnNumberLabel'
  const rows = [{ key: { text: localise(numberLabel) }, value: { text: '' } }]

  if (isNotDraft) {
    rows.push(buildStatusRow(statusConfig, localise))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise),
    ...buildPrnAuthorisationRows(prn, organisationData, localise)
  )

  return rows
}

/**
 * Build the status row for the PRN details
 * @param {{text: string, class: string}} statusConfig
 * @param {(key: string) => string} localise
 * @returns {object}
 */
function buildStatusRow(statusConfig, localise) {
  return {
    key: { text: localise('lprns:view:status') },
    value: {
      html: `<strong class="govuk-tag ${statusConfig.class}">${statusConfig.text}</strong>`
    }
  }
}

/**
 * Build core PRN detail rows (buyer, tonnage, process, december waste)
 * @param {object} prn
 * @param {(key: string) => string} localise
 * @returns {Array}
 */
function buildPrnCoreRows(prn, localise) {
  const decemberWasteText = prn.isDecemberWaste
    ? localise('lprns:decemberWasteYes')
    : localise('lprns:decemberWasteNo')

  return [
    {
      key: { text: localise('lprns:buyerLabel') },
      value: { text: prn.issuedToOrganisation }
    },
    {
      key: { text: localise('lprns:tonnageLabel') },
      value: { text: String(prn.tonnage) }
    },
    {
      key: { text: localise('lprns:tonnageInWordsLabel') },
      value: { text: prn.tonnageInWords || '' }
    },
    {
      key: { text: localise('lprns:processToBeUsedLabel') },
      value: { text: prn.processToBeUsed || '' }
    },
    {
      key: { text: localise('lprns:decemberWasteLabel') },
      value: { text: decemberWasteText }
    }
  ]
}

/**
 * Build authorisation-related PRN detail rows
 * @param {object} prn
 * @param {object} organisationData
 * @param {(key: string) => string} localise
 * @returns {Array}
 */
function buildPrnAuthorisationRows(prn, organisationData, localise) {
  const issuedDate = prn.authorisedAt
    ? formatDateForDisplay(prn.authorisedAt)
    : ''
  const issuedBy =
    organisationData?.companyDetails?.name || localise('lprns:notAvailable')
  const notesText = prn.notes || localise('lprns:notProvided')

  return [
    {
      key: { text: localise('lprns:issuedDateLabel') },
      value: { text: issuedDate }
    },
    {
      key: { text: localise('lprns:issuedByLabel') },
      value: { text: issuedBy }
    },
    {
      key: { text: localise('lprns:authorisedByLabel') },
      value: { text: prn.authorisedBy?.name || '' }
    },
    {
      key: { text: localise('lprns:positionLabel') },
      value: { text: prn.authorisedBy?.position || '' }
    },
    {
      key: { text: localise('lprns:issuerNotesLabel') },
      value: { text: notesText }
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
 * @param {boolean} params.isExporter - Whether the registration is for an exporter
 * @returns {Array} Summary list rows
 */
function buildAccreditationRows({
  registration,
  accreditation,
  displayMaterial,
  localise,
  isExporter
}) {
  const rows = [
    {
      key: { text: localise('lprns:materialLabel') },
      value: { text: displayMaterial }
    },
    {
      key: { text: localise('lprns:accreditationNumberLabel') },
      value: { text: accreditation?.accreditationNumber || '' }
    }
  ]

  if (!isExporter) {
    rows.push({
      key: { text: localise('lprns:accreditationAddressLabel') },
      value: { text: formatAddress(registration.site?.address) }
    })
  }

  return rows
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
      text: localise('lprns:list:status:awaitingAuthorisation'),
      class: 'govuk-tag--blue epr-tag--no-max-width'
    },
    issued: {
      text: localise('lprns:list:status:issued'),
      class: 'govuk-tag--blue epr-tag--no-max-width'
    },
    cancelled: {
      text: localise('lprns:list:status:cancelled'),
      class: 'govuk-tag--grey epr-tag--no-max-width'
    }
  }

  return statusMap[status] ?? { text: status, class: 'epr-tag--no-max-width' }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
