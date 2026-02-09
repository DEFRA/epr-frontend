import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import {
  buildPrnIssuerRows,
  buildPrnCoreRows,
  buildStatusRow
} from './helpers/build-prn-detail-rows.js'
import { getDisplayName } from '#server/common/helpers/waste-organisations/get-display-name.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'
import { getStatusConfig } from './helpers/get-status-config.js'
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
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
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
          { status: 'discarded' },
          session.idToken
        )

        request.yar.clear('prnDraft')

        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create?error=insufficient_balance`
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
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/created`
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

  const { isExporter, noteType } = getNoteTypeDisplayNames(registration)

  const displayMaterial = getLumpyDisplayMaterial(registration)

  const prnDetailRows = buildDraftPrnDetailRows({
    prnDraft,
    localise,
    organisationData
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise,
    isExporter
  })

  return h.view('lprns/view', {
    pageTitle: localise('lprns:create:checkPageTitle', { noteType }),
    caption: localise('lprns:create:caption', { noteType }),
    heading: localise('lprns:create:checkHeading', { noteType }),
    introText: localise('lprns:create:checkIntroText', { noteType }),
    authorisationText: localise('lprns:create:checkAuthorisationText', {
      noteType
    }),
    insetText: localise('lprns:create:checkInsetText', { noteType }),
    prnDetailsHeading: localise('lprns:details:heading', { noteType }),
    prnDetailRows,
    accreditationDetailsHeading: localise('lprns:accreditationDetailsHeading'),
    accreditationRows,
    createButton: {
      text: localise('lprns:create:createButton', { noteType })
    },
    discardLink: {
      text: localise('lprns:create:discardLink'),
      href: `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnDraft.id}/discard`
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

  const recipientDisplayName = getDisplayName(prn.issuedToOrganisation)

  const { isExporter, noteType, wasteAction } =
    getNoteTypeDisplayNames(registration)

  const backUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  )

  const displayMaterial = getLumpyDisplayMaterial(registration)

  const statusConfig = getStatusConfig(prn.status, localise)
  const isNotDraft = prn.status !== 'draft'

  const prnDetailRows = buildExistingPrnDetailRows({
    prn,
    localise,
    noteType,
    statusConfig,
    isNotDraft,
    recipientDisplayName,
    organisationData
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
    noteType,
    wasteAction,
    isNotDraft,
    prnDetailRows,
    accreditationRows,
    backUrl,
    localise,
    request,
    organisationId,
    registrationId,
    accreditationId
  })

  return h.view('lprns/view', viewData)
}

/**
 * Builds the view data object for an existing PRN
 * @param {object} params
 * @param {object} params.prn - PRN data from backend
 * @param {string} params.noteType - 'PRN' or 'PERN'
 * @param {string} params.wasteAction - 'export' or 'reprocessing'
 * @param {boolean} params.isNotDraft - Whether the PRN is not a draft
 * @param {Array} params.prnDetailRows - PRN detail summary rows
 * @param {Array} params.accreditationRows - Accreditation summary rows
 * @param {string} params.backUrl - Back link URL
 * @param {(key: string, params?: object) => string} params.localise - Translation function
 * @param {object} params.request - Hapi request object
 * @param {string} params.organisationId
 * @param {string} params.registrationId
 * @param {string} params.accreditationId
 * @returns {object} View data object
 */
function buildExistingPrnViewData({
  prn,
  noteType,
  wasteAction,
  isNotDraft,
  prnDetailRows,
  accreditationRows,
  backUrl,
  localise,
  request,
  organisationId,
  registrationId,
  accreditationId
}) {
  const returnUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

  return {
    pageTitle: `${noteType} ${prn.id}`,
    heading: noteType,
    showRegulatorLogos: isNotDraft,
    complianceYearText:
      isNotDraft && prn.accreditationYear != null
        ? localise('lprns:view:complianceYearText', {
            noteType,
            wasteAction,
            year: `<strong>${prn.accreditationYear}</strong>`
          })
        : null,
    prnDetailsHeading: localise('lprns:details:heading', { noteType }),
    prnDetailRows,
    accreditationDetailsHeading: localise('lprns:accreditationDetailsHeading'),
    accreditationRows,
    backUrl,
    returnLink: {
      href: request.localiseUrl(returnUrl),
      text: localise('lprns:view:returnLink', { noteType })
    }
  }
}

/**
 * Builds the PRN/PERN details rows for a draft PRN (creation flow)
 * @param {object} params
 * @param {object} params.prnDraft - Draft PRN data from session
 * @param {(key: string) => string} params.localise - Translation function
 * @param {object} params.organisationData - Organisation data
 * @returns {Array} Summary list rows
 */
function buildDraftPrnDetailRows({ prnDraft, localise, organisationData }) {
  return [
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
      value: { text: prnDraft.tonnageInWords }
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
      key: { text: localise('lprns:issuerLabel') },
      value: { text: organisationData.companyDetails?.name || '' }
    },
    {
      key: { text: localise('lprns:issuedDateLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('lprns:issuedByLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('lprns:positionLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('lprns:issuerNotesLabel') },
      value: { text: prnDraft.notes || localise('lprns:notProvided') }
    }
  ]
}

/**
 * Builds the PRN/PERN details rows for an existing PRN (from backend)
 */
function buildExistingPrnDetailRows({
  prn,
  localise,
  noteType,
  statusConfig,
  isNotDraft,
  recipientDisplayName,
  organisationData
}) {
  const rows = [
    {
      key: { text: localise('lprns:details:numberLabel', { noteType }) },
      value: { text: prn.prnNumber || '' }
    }
  ]

  if (isNotDraft) {
    rows.push(buildStatusRow(localise, statusConfig))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise, recipientDisplayName),
    ...buildPrnIssuerRows(prn, localise, {
      issuerName: organisationData?.companyDetails?.name || ''
    })
  )

  return rows
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
