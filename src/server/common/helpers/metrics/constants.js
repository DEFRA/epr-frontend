export const TRANSACTION_START = 'TransactionStart'
export const TRANSACTION_END = 'TransactionEnd'

/**
 * @typedef {{ start: string, end: string }} JourneyEntry
 */

/**
 * Journeys feeding the mandatory GDS KPIs, one dimension value per start and
 * end. A journey with more than one ending gets its own entry rather than
 * sharing one with several end keys.
 * @type {Record<string, JourneyEntry>}
 */
export const JOURNEY = Object.freeze({
  createPrn: Object.freeze({
    start: 'SaveDraftPRNStart',
    end: 'SaveDraftPRNEnd'
  }),
  issuePrn: Object.freeze({
    start: 'IssuePRNStart',
    end: 'IssuePRNEnd'
  }),
  uploadSummaryLog: Object.freeze({
    start: 'UploadSummaryLogStart',
    end: 'UploadSummaryLogEnd'
  }),
  createReport: Object.freeze({
    start: 'SaveDraftReportStart',
    end: 'SaveDraftReportEnd'
  }),
  submitReport: Object.freeze({
    start: 'SubmitReportStart',
    end: 'SubmitReportEnd'
  }),
  cancelPrn: Object.freeze({
    start: 'CancelPRNStart',
    end: 'CancelPRNEnd'
  }),
  discardPrn: Object.freeze({
    start: 'DiscardPRNStart',
    end: 'DiscardPRNEnd'
  }),
  deletePrn: Object.freeze({
    start: 'DeletePRNStart',
    end: 'DeletePRNEnd'
  }),
  deleteReport: Object.freeze({
    start: 'DeleteReportStart',
    end: 'DeleteReportEnd'
  })
})
