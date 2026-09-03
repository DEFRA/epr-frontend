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
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { journeyMetrics } from '#server/common/helpers/metrics/index.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getStatusConfig } from './helpers/get-status-config.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'
import { getRegistrationMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
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
      return handleDraftView(h, {
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

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const viewPostController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, accreditationId, prnId } = request.params
    const session = request.auth.credentials

    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id !== prnId) {
      return h.redirect(`${notesPath(request.params)}/create`)
    }

    try {
      const wasteBalanceMap = await fetchWasteBalances(
        organisationId,
        [accreditationId],
        session.backendToken
      )
      const availableAmount =
        wasteBalanceMap[accreditationId]?.availableAmount ?? 0

      return await (prnDraft.tonnage > availableAmount
        ? discardDraftOverBalance(request, h, { availableAmount, prnDraft })
        : confirmDraft(request, h, { prnDraft }))
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

/** @param {PrnDetailParams} params */
const notesPath = ({ organisationId, registrationId, accreditationId }) =>
  `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

/**
 * Discards a draft whose tonnage no longer fits the available waste balance.
 * @param {HapiRequest & { params: PrnDetailParams }} request
 * @param {ResponseToolkit} h
 * @param {{ availableAmount: number, prnDraft: PrnDraftSession }} params
 */
const discardDraftOverBalance = async (
  request,
  h,
  { availableAmount, prnDraft }
) => {
  const { organisationId, registrationId, accreditationId, prnId } =
    request.params

  request.logger.warn({
    message: 'PRN tonnage exceeds available waste balance',
    event: {
      action: 'prn_tonnage_exceeds_balance',
      reference: prnId,
      reason: `tonnage=${prnDraft.tonnage} availableAmount=${availableAmount}`
    }
  })

  await updatePrnStatus(
    organisationId,
    registrationId,
    accreditationId,
    prnId,
    { status: 'discarded' },
    request.auth.credentials.backendToken
  )

  request.yar.clear('prnDraft')

  return h.redirect(
    `${notesPath(request.params)}/create?error=insufficient_balance`
  )
}

/**
 * Moves a draft to awaiting authorisation, ending the create journey.
 * @param {HapiRequest & { params: PrnDetailParams }} request
 * @param {ResponseToolkit} h
 * @param {{ prnDraft: PrnDraftSession }} params
 */
const confirmDraft = async (request, h, { prnDraft }) => {
  const { organisationId, registrationId, accreditationId, prnId } =
    request.params

  const result = await updatePrnStatus(
    organisationId,
    registrationId,
    accreditationId,
    prnId,
    { status: 'awaiting_authorisation' },
    request.auth.credentials.backendToken
  )

  request.yar.clear('prnDraft')
  request.yar.set('prnCreated', {
    id: result.id,
    tonnage: result.tonnage,
    material: result.material,
    status: result.status,
    wasteProcessingType: prnDraft.wasteProcessingType
  })

  await journeyMetrics.end(
    request,
    JOURNEY.createPrnPern,
    accreditationId,
    'draft'
  )

  return h.redirect(`${notesPath(request.params)}/${prnId}/created`)
}

/**
 * Handle viewing a draft PRN (creation flow)
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
      backendToken: session.backendToken,
      accreditationId
    })

  const { isExporter, noteType } = getNoteTypeDisplayNames(registration)

  const displayMaterial = getRegistrationMaterialDisplayName(registration)

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
        backendToken: session.backendToken,
        accreditationId
      }),
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        session.backendToken
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

  const displayMaterial = getRegistrationMaterialDisplayName(registration)

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
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { TFunction } from 'i18next'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { PackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
 * @import { PrnDetailParams, PrnDraftSession } from './helpers/session-types.js'
 */
