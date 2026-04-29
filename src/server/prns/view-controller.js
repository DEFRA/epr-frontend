import { isNil } from '#server/common/helpers/is-nil.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import {
  buildPrnCoreRows,
  buildPrnIssuerRows,
  buildStatusRow
} from './helpers/build-prn-detail-rows.js'
import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'
import { getIssuingOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issuing-org-display-name.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getStatusConfig } from './helpers/get-status-config.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const viewController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Check for draft PRN data in session (creation flow)
    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id === prnId) {
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
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    // Retrieve draft PRN data from session
    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id !== prnId) {
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
      if (error.isBoom) {
        throw error
      }

      throw badImplementation(
        'Failed to confirm PRN',
        errorCodes.prnConfirmFailed,
        {
          event: {
            action: 'confirm_prn',
            reason: classifierTail(error)
          }
        }
      )
    }
  }
}

/**
 * Handle viewing a draft PRN (creation flow)
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   prnDraft: PrnDraftSession,
 *   localise: TFunction,
 *   session: UserSession
 * }} params
 */
async function handleDraftView(
  request,
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
    await getRequiredRegistrationWithAccreditation({
      organisationId,
      registrationId,
      idToken: session.idToken,
      accreditationId
    })

  const { isExporter, noteType } = getNoteTypeDisplayNames(registration)

  const displayMaterial = getDisplayMaterial(registration)

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

  return h.view('prns/view', {
    pageTitle: localise('prns:create:checkPageTitle', { noteType }),
    caption: localise('prns:create:caption', { noteType }),
    heading: localise('prns:create:checkHeading', { noteType }),
    introText: localise('prns:create:checkIntroText', { noteType }),
    authorisationText: localise('prns:create:checkAuthorisationText', {
      noteType
    }),
    insetText: localise('prns:create:checkInsetText', { noteType }),
    prnDetailsHeading: localise('prns:details:heading', { noteType }),
    prnDetailRows,
    accreditationDetailsHeading: localise('prns:accreditationDetailsHeading'),
    accreditationRows,
    createButton: {
      text: localise('prns:create:createButton', { noteType })
    },
    discardLink: {
      text: localise('prns:create:discardLink'),
      href: `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnDraft.id}/discard`
    },
    organisationId,
    registrationId,
    accreditationId
  })
}

/**
 * Handle viewing an existing PRN (from backend)
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   prnId: string,
 *   localise: TFunction,
 *   session: UserSession
 * }} params
 */
async function handleExistingView(
  request,
  h,
  { organisationId, registrationId, accreditationId, prnId, localise, session }
) {
  // Fetch PRN and registration data from backend
  const [{ organisationData, registration, accreditation }, prn] =
    await Promise.all([
      getRequiredRegistrationWithAccreditation({
        organisationId,
        registrationId,
        idToken: session.idToken,
        accreditationId
      }),
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        session.idToken
      )
    ])

  const recipientDisplayName = getIssuedToOrgDisplayName(
    prn.issuedToOrganisation
  )

  const { isExporter, noteType, noteTypeFull, wasteAction } =
    getNoteTypeDisplayNames(registration)

  const backUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  )

  const displayMaterial = getDisplayMaterial(registration)

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
    noteTypeFull,
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

  return h.view('prns/view', viewData)
}

/**
 * Builds the view data object for an existing PRN
 * @param {{
 *   prn: PackagingRecyclingNote,
 *   noteType: string,
 *   noteTypeFull: string,
 *   wasteAction: string,
 *   isNotDraft: boolean,
 *   prnDetailRows: Array<object>,
 *   accreditationRows: Array<object>,
 *   backUrl: string,
 *   localise: TFunction,
 *   request: HapiRequest,
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string
 * }} params
 * @returns {object} View data object
 */
function buildExistingPrnViewData({
  prn,
  noteType,
  noteTypeFull,
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
    pageTitle: `${noteType} ${prn.prnNumber ?? prn.id}`,
    heading: noteTypeFull,
    showRegulatorLogos: isNotDraft,
    complianceYearText:
      isNotDraft && !isNil(prn.accreditationYear)
        ? localise('prns:view:complianceYearText', {
            noteType,
            wasteAction,
            year: `<strong>${prn.accreditationYear}</strong>`
          })
        : null,
    prnDetailsHeading: localise('prns:details:heading', { noteType }),
    prnDetailRows,
    accreditationDetailsHeading: localise('prns:accreditationDetailsHeading'),
    accreditationRows,
    backUrl,
    returnLink: {
      href: request.localiseUrl(returnUrl),
      text: localise('prns:view:returnLink', { noteType })
    }
  }
}

/**
 * Builds the PRN/PERN details rows for a draft PRN (creation flow)
 * @param {{
 *   prnDraft: PrnDraftSession,
 *   localise: TFunction,
 *   organisationData: { companyDetails?: { name: string, tradingName?: string | null, registrationType?: string } }
 * }} params
 * @returns {Array} Summary list rows
 */
function buildDraftPrnDetailRows({ prnDraft, localise, organisationData }) {
  return [
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
      value: { text: prnDraft.tonnageInWords }
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
      key: { text: localise('prns:issuerLabel') },
      value: {
        text: organisationData.companyDetails
          ? getIssuingOrgDisplayName(organisationData.companyDetails)
          : ''
      }
    },
    {
      key: { text: localise('prns:issuedDateLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('prns:issuedByLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('prns:positionLabel') },
      value: { text: '' }
    },
    {
      key: { text: localise('prns:issuerNotesLabel') },
      value: { text: prnDraft.notes || localise('prns:notProvided') }
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
      key: { text: localise('prns:details:numberLabel', { noteType }) },
      value: { text: prn.prnNumber || '' }
    }
  ]

  if (isNotDraft) {
    rows.push(buildStatusRow(localise, statusConfig))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise, recipientDisplayName),
    ...buildPrnIssuerRows(prn, localise, {
      issuerName: organisationData?.companyDetails
        ? getIssuingOrgDisplayName(organisationData.companyDetails)
        : ''
    })
  )

  return rows
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { TFunction } from 'i18next'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { PackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
 * @import { PrnDetailParams, PrnDraftSession } from './helpers/session-types.js'
 */
