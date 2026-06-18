import { PATHS } from './journey.js'
import { getDraft, saveDraft, clearDraft } from './draft.js'
import {
  buildSummaryRows,
  buildWasteTrackingRows,
  deriveTotals
} from './summary.js'
import { assignRowId } from './row-id.js'
import { buildErrorView } from './errors.js'
import {
  DWT_FIELDS,
  EXAMPLE_WASTE_TRACKING_IDS,
  lookupWasteMovement
} from './waste-tracking.js'

const COMPLETE_KEY = 'receivedLoadComplete'

const METHOD_TRACKING = 'tracking'

/**
 * Removes any waste-tracking-sourced state from a draft, so switching to manual
 * entry after a lookup starts from a clean slate.
 *
 * @param {Record<string, any>} draft
 */
const withoutWasteTracking = (draft) => {
  const { fromWasteTracking, ...rest } = draft
  for (const field of DWT_FIELDS) {
    delete rest[field]
  }
  return rest
}

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
      startUrl: PATHS.method
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

/**
 * Asks how the user wants to add the load: by waste tracking ID (which prefills
 * and locks the movement facts) or by entering everything manually.
 */
export const methodGetController = {
  method: 'GET',
  path: PATHS.method,
  options: { auth: false },
  handler: (request, h) =>
    h.view('received-loads/how', {
      pageTitle: 'How do you want to add this received load?',
      backUrl: PATHS.start,
      formAction: PATHS.method
    })
}

export const methodPostController = {
  method: 'POST',
  path: PATHS.method,
  options: { auth: false },
  handler: (request, h) => {
    if (request.payload.addMethod === METHOD_TRACKING) {
      return h.redirect(PATHS.wasteTrackingId)
    }
    if (request.payload.addMethod === 'manual') {
      saveDraft(request, withoutWasteTracking(getDraft(request)))
      return h.redirect(PATHS.dateReceived)
    }
    const { errors, errorSummary } = buildErrorView([
      { field: 'addMethod', message: 'Select how you want to add this received load' }
    ])
    return h
      .view('received-loads/how', {
        pageTitle: 'How do you want to add this received load?',
        backUrl: PATHS.start,
        formAction: PATHS.method,
        errors,
        errorSummary
      })
      .takeover()
  }
}

/**
 * Enters a waste tracking ID and looks up the movement. A match prefills and
 * locks the six waste-tracking fields; no match re-renders with an error.
 */
export const wasteTrackingIdGetController = {
  method: 'GET',
  path: PATHS.wasteTrackingId,
  options: { auth: false },
  handler: (request, h) =>
    h.view('received-loads/waste-tracking-id', {
      pageTitle: 'Enter your waste tracking ID',
      backUrl: PATHS.method,
      formAction: PATHS.wasteTrackingId,
      examples: EXAMPLE_WASTE_TRACKING_IDS
    })
}

export const wasteTrackingIdPostController = {
  method: 'POST',
  path: PATHS.wasteTrackingId,
  options: { auth: false },
  handler: (request, h) => {
    const wasteTrackingId = (request.payload.wasteTrackingId ?? '').trim()
    const movement = wasteTrackingId ? lookupWasteMovement(wasteTrackingId) : null

    if (!movement) {
      const message = wasteTrackingId
        ? 'No waste movement was found for that waste tracking ID'
        : 'Enter a waste tracking ID'
      const { errors, errorSummary } = buildErrorView([
        { field: 'wasteTrackingId', message }
      ])
      return h
        .view('received-loads/waste-tracking-id', {
          pageTitle: 'Enter your waste tracking ID',
          backUrl: PATHS.method,
          formAction: PATHS.wasteTrackingId,
          examples: EXAMPLE_WASTE_TRACKING_IDS,
          values: { wasteTrackingId },
          errors,
          errorSummary
        })
        .takeover()
    }

    saveDraft(request, {
      ...getDraft(request),
      ...movement,
      fromWasteTracking: true
    })
    return h.redirect(PATHS.trackingDetails)
  }
}

/**
 * Confirms the locked details fetched from waste tracking before the rest of
 * the journey collects the reprocessor's own figures.
 */
export const trackingDetailsController = {
  method: 'GET',
  path: PATHS.trackingDetails,
  options: { auth: false },
  handler: (request, h) => {
    const draft = getDraft(request)
    if (!draft.fromWasteTracking) {
      return h.redirect(PATHS.method)
    }
    return h.view('received-loads/waste-tracking-details', {
      pageTitle: 'Check the details from waste tracking',
      backUrl: PATHS.wasteTrackingId,
      rows: buildWasteTrackingRows(draft),
      continueUrl: PATHS.prn
    })
  }
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
