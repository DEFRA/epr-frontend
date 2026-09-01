export const TRANSACTION_START = 'TransactionStart'
export const TRANSACTION_END = 'TransactionEnd'

/**
 * @typedef {typeof TRANSACTION[keyof typeof TRANSACTION]} TransactionValue
 */
export const TRANSACTION = Object.freeze({
  saveOrIssuePrnPernStart: 'SaveOrIssuePRNPERNStart',
  issuePrnPernEnd: 'IssuePRNPERNEnd',
  saveDraftPrnPernEnd: 'SaveDraftPRNPERNEnd',
  uploadSummaryLogStart: 'UploadSummaryLogStart',
  uploadSummaryLogEnd: 'UploadSummaryLogEnd',
  saveOrSubmitReportStart: 'SaveOrSubmitReportStart',
  submitReportEnd: 'SubmitReportEnd',
  saveDraftReportEnd: 'SaveDraftReportEnd'
})
