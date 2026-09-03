export const TRANSACTION_START = 'TransactionStart'
export const TRANSACTION_END = 'TransactionEnd'

/**
 * Journeys feeding the mandatory GDS KPIs. Each holds the dimension value for
 * its start and one per possible ending, named as agreed on PAE-1781 so the
 * dashboard's series labels come straight from these values.
 * @typedef {typeof JOURNEY[keyof typeof JOURNEY]} Journey
 */
export const JOURNEY = Object.freeze({
  createPrnPern: Object.freeze({
    start: 'SaveOrIssuePRNPERNStart',
    draft: 'SaveDraftPRNPERNEnd'
  }),
  issuePrnPern: Object.freeze({
    start: 'IssuePRNPERNStart',
    issued: 'IssuePRNPERNEnd'
  }),
  uploadSummaryLog: Object.freeze({
    start: 'UploadSummaryLogStart',
    uploaded: 'UploadSummaryLogEnd'
  }),
  createReport: Object.freeze({
    start: 'SaveOrSubmitReportStart',
    draft: 'SaveDraftReportEnd'
  }),
  submitReport: Object.freeze({
    start: 'SubmitReportStart',
    submitted: 'SubmitReportEnd'
  }),
  cancelPrnPern: Object.freeze({
    start: 'CancelPRNPERNStart',
    cancelled: 'CancelPRNPERNEnd'
  }),
  discardPrnPern: Object.freeze({
    start: 'DiscardPRNPERNStart',
    discarded: 'DiscardPRNPERNEnd'
  }),
  deletePrnPern: Object.freeze({
    start: 'DeletePRNPERNStart',
    deleted: 'DeletePRNPERNEnd'
  }),
  deleteReport: Object.freeze({
    start: 'DeleteReportStart',
    deleted: 'DeleteReportEnd'
  })
})
