import { isNil } from '#server/common/helpers/is-nil.js'
import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRequiredAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { availableForPool } from '#server/common/helpers/waste-balance/available-for-pool.js'
import { fetchDecemberPrnEligibility } from './helpers/fetch-december-prn-eligibility.js'
import { DECEMBER_WASTE_CONTROL } from './helpers/december-waste-control.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import {
  buildPrnCoreRows,
  buildPrnIssuerRows,
  buildStatusRow
} from './helpers/build-prn-detail-rows.js'
import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'
import { organisationViewName } from '#server/registrations/details/helpers/caption.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { toAccreditationKeys } from './helpers/fetch-prn-context.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchOrganisationWasteBalances } from '#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js'
import { year } from '#server/common/helpers/year.js'
import { buildNoteBreadcrumbs } from './helpers/build-note-breadcrumbs.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getStatusConfig } from './helpers/get-status-config.js'
import { noteReturn } from './helpers/note-return-path.js'
import { prnsPath } from './helpers/prn-resource.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

/**
 * @typedef {{ keys: AccreditationKeys, prnId: string, prnDraft: PrnDraftSession }} DraftParams
 */

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const viewController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)
    const { prnId } = request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Check for draft PRN data in session (creation flow)
    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id === prnId) {
      // Creation flow - show check page with draft data
      return handleDraftView(h, { keys, prnDraft, localise, session })
    }

    // View existing PRN - fetch from backend
    return handleExistingView(request, h, { keys, prnId, localise, session })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const viewPostController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)
    const { prnId } = request.params
    const { backendToken } = request.auth.credentials

    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id !== prnId) {
      return h.redirect(`${prnsPath(keys)}/create`)
    }

    try {
      const [{ accreditation }, eligibility] = await Promise.all([
        fetchRequiredAccreditation(keys, backendToken),
        fetchDecemberPrnEligibility(keys, backendToken)
      ])
      // A failed read fails the confirmation, so an outage never discards a draft
      const balances = await fetchOrganisationWasteBalances(
        organisationNumber(Number(keys.organisationNumber)),
        year(Number(keys.year)),
        backendToken
      )
      const balance = balances[accreditation.accreditationNumber] ?? {
        amount: 0,
        availableAmount: 0
      }
      const availableAmount = availableForPool(
        balance,
        prnDraft.isDecemberWaste &&
          eligibility.mode === DECEMBER_WASTE_CONTROL.selectPool
      )
      const draftParams = { keys, prnId, prnDraft }

      return await (prnDraft.tonnage > availableAmount
        ? discardDraftOverBalance(request, h, {
            ...draftParams,
            availableAmount
          })
        : confirmDraft(request, h, draftParams))
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
 * Discards a draft whose tonnage no longer fits the available waste balance.
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {DraftParams & { availableAmount: number }} params
 */
const discardDraftOverBalance = async (
  request,
  h,
  { keys, prnId, availableAmount, prnDraft }
) => {
  request.logger.warn({
    message: 'PRN tonnage exceeds available waste balance',
    event: {
      action: 'prn_tonnage_exceeds_balance',
      reference: prnId,
      reason: `tonnage=${prnDraft.tonnage} availableAmount=${availableAmount}`
    }
  })

  await updatePrnStatus(
    keys,
    prnId,
    { status: 'discarded' },
    request.auth.credentials.backendToken
  )

  request.yar.clear('prnDraft')

  const poolParam = prnDraft.isDecemberWaste ? '&pool=december' : ''

  return h.redirect(
    `${prnsPath(keys)}/create?error=insufficient_balance${poolParam}`
  )
}

/**
 * Moves a draft to awaiting authorisation, ending the create journey.
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {DraftParams} params
 */
const confirmDraft = async (request, h, { keys, prnId, prnDraft }) => {
  const result = await updatePrnStatus(
    keys,
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
    wasteProcessingType: prnDraft.wasteProcessingType,
    isDecemberWaste: prnDraft.isDecemberWaste
  })

  await metrics.journey.end(request, JOURNEY.createPrn, prnsPath(keys))

  return h.redirect(`${prnsPath(keys)}/${prnId}/created`)
}

/**
 * Handle viewing a draft PRN (creation flow)
 * @param {ResponseToolkit} h
 * @param {{
 *   keys: AccreditationKeys,
 *   prnDraft: PrnDraftSession,
 *   localise: TFunction,
 *   session: UserSession
 * }} params
 */
async function handleDraftView(h, { keys, prnDraft, localise, session }) {
  const { organisation, registration, accreditation } =
    await fetchRequiredAccreditation(keys, session.backendToken)

  const { noteType } = getNoteTypeDisplayNames(registration)

  const displayMaterial = getMaterialDisplayName(registration.material)

  const prnDetailRows = buildDraftPrnDetailRows({
    prnDraft,
    localise,
    organisation
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise
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
      href: `${prnsPath(keys)}/${prnDraft.id}/discard`
    }
  })
}

/**
 * Handle viewing an existing PRN (from backend)
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {{
 *   keys: AccreditationKeys,
 *   prnId: string,
 *   localise: TFunction,
 *   session: UserSession
 * }} params
 */
async function handleExistingView(
  request,
  h,
  { keys, prnId, localise, session }
) {
  // Fetch PRN and registration data from backend
  const [{ organisation, registration, accreditation }, prn] =
    await Promise.all([
      fetchRequiredAccreditation(keys, session.backendToken),
      fetchPackagingRecyclingNote(keys, prnId, session.backendToken)
    ])

  const recipientDisplayName = getIssuedToOrgDisplayName(
    prn.issuedToOrganisation
  )

  const { noteType, noteTypeFull, noteTypePlural, wasteAction } =
    getNoteTypeDisplayNames(registration)

  const isRegulator = readsAsARegulator(session)

  const back = noteReturn(keys)

  // A regulator walks the trail back instead, so the page offers them neither
  // the back link nor the return link. An operator reads a note from their own
  // list and keeps both.
  const backUrl = isRegulator ? null : request.localiseUrl(back.path)

  const breadcrumbs = isRegulator
    ? buildNoteBreadcrumbs({
        organisation,
        keys,
        noteTypePlural,
        prn,
        localise,
        localiseUrl: request.localiseUrl.bind(request)
      })
    : []

  const displayMaterial = getMaterialDisplayName(registration.material)

  const statusConfig = getStatusConfig(prn.status, localise)
  const isNotDraft = prn.status !== 'draft'

  const prnDetailRows = buildExistingPrnDetailRows({
    prn,
    localise,
    noteType,
    statusConfig,
    isNotDraft,
    recipientDisplayName,
    organisation
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise
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
    back,
    isRegulator,
    localise,
    request
  })

  return h.view('prns/view', { ...viewData, breadcrumbs })
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
 *   backUrl: string | null,
 *   back: { path: string, textKey: string },
 *   isRegulator: boolean,
 *   localise: TFunction,
 *   request: HapiRequest
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
  back,
  isRegulator,
  localise,
  request
}) {
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
    returnLink: isRegulator
      ? null
      : {
          href: request.localiseUrl(back.path),
          text: localise(back.textKey, { noteType })
        }
  }
}

/**
 * Builds the PRN/PERN details rows for a draft PRN (creation flow)
 * @param {{
 *   prnDraft: PrnDraftSession,
 *   localise: TFunction,
 *   organisation: OrganisationView
 * }} params
 * @returns {Array} Summary list rows
 */
function buildDraftPrnDetailRows({ prnDraft, localise, organisation }) {
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
      value: { text: organisationViewName(organisation) }
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
  organisation
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
      issuerName: organisationViewName(organisation)
    })
  )

  return rows
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { TFunction } from 'i18next'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { PackagingRecyclingNote } from './helpers/prn-resource.js'
 * @import { PrnDetailParams, PrnDraftSession } from './helpers/session-types.js'
 */
