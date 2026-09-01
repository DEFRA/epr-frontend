export const TRANSACTION_START = 'TransactionStart'
export const TRANSACTION_END = 'TransactionEnd'

/**
 * Journeys feeding the mandatory GDS KPIs. Each holds the dimension value for
 * its start and one per possible ending, named as agreed on PAE-1781 so the
 * dashboard's series labels come straight from these values.
 * @typedef {typeof JOURNEY[keyof typeof JOURNEY]} Journey
 */
export const JOURNEY = Object.freeze({
  saveOrIssuePrnPern: Object.freeze({
    start: 'SaveOrIssuePRNPERNStart',
    issued: 'IssuePRNPERNEnd',
    draft: 'SaveDraftPRNPERNEnd'
  }),
  uploadSummaryLog: Object.freeze({
    start: 'UploadSummaryLogStart',
    uploaded: 'UploadSummaryLogEnd'
  }),
  saveOrSubmitReport: Object.freeze({
    start: 'SaveOrSubmitReportStart',
    submitted: 'SubmitReportEnd',
    draft: 'SaveDraftReportEnd'
  })
})
