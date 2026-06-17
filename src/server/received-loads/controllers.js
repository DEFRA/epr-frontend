import { PATHS } from './journey.js'
import { getDraft, saveDraft, clearDraft } from './draft.js'
import { buildSummaryRows, deriveTotals } from './summary.js'
import { assignRowId } from './row-id.js'

const COMPLETE_KEY = 'receivedLoadComplete'

/**
 * Core fields that must be present before the check-your-answers page makes
 * sense. If any are missing the user is sent back to the start.
 */
const REQUIRED_FIELDS = [
  'dateReceived',
  'ewcCode',
  'wasteDescription',
  'prnIssued',
  'grossWeight',
  'tareWeight',
  'palletWeight',
  'bailingWireProtocol',
  'calculationMethod',
  'nonTargetWeight',
  'recyclablePercentage'
]

const isComplete = (draft) =>
  REQUIRED_FIELDS.every((field) => draft[field] !== undefined)

/**
 * Start page. Clears any previous draft so each run begins fresh.
 */
export const startController = {
  method: 'GET',
  path: PATHS.start,
  options: { auth: false },
  handler: (request, h) => {
    clearDraft(request)
    saveDraft(request, {})
    return h.view('received-loads/start', {
      pageTitle: 'Add a received load',
      startUrl: PATHS.dateReceived
    })
  }
}

/**
 * Redirects the bare base path to the start page.
 */
export const baseRedirectController = {
  method: 'GET',
  path: PATHS.base,
  options: { auth: false },
  handler: (request, h) => h.redirect(PATHS.start)
}

export const checkGetController = {
  method: 'GET',
  path: PATHS.check,
  options: { auth: false },
  handler: (request, h) => {
    const draft = getDraft(request)
    if (!isComplete(draft)) {
      return h.redirect(PATHS.start)
    }
    return h.view('received-loads/check-your-answers', {
      pageTitle: 'Check your answers',
      rows: buildSummaryRows(draft),
      formAction: PATHS.check
    })
  }
}

export const checkPostController = {
  method: 'POST',
  path: PATHS.check,
  options: { auth: false },
  handler: (request, h) => {
    const draft = getDraft(request)
    if (!isComplete(draft)) {
      return h.redirect(PATHS.start)
    }
    const { tonnageForRecycling } = deriveTotals(draft)
    request.yar.set(COMPLETE_KEY, {
      rowId: assignRowId(request),
      wasteDescription: draft.wasteDescription,
      tonnageForRecycling
    })
    clearDraft(request)
    return h.redirect(PATHS.confirmation)
  }
}

export const confirmationController = {
  method: 'GET',
  path: PATHS.confirmation,
  options: { auth: false },
  handler: (request, h) => {
    const completed = request.yar.get(COMPLETE_KEY)
    if (!completed) {
      return h.redirect(PATHS.start)
    }
    request.yar.clear(COMPLETE_KEY)
    return h.view('received-loads/confirmation', {
      pageTitle: 'Received load added',
      rowId: completed.rowId,
      wasteDescription: completed.wasteDescription,
      tonnageForRecycling: completed.tonnageForRecycling,
      startUrl: PATHS.start
    })
  }
}
