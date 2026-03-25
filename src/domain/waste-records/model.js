export const WASTE_RECORD_TYPE = Object.freeze({
  EXPORTED: 'exported',
  PROCESSED: 'processed',
  RECEIVED: 'received',
  SENT_ON: 'sentOn'
})

/** @typedef {typeof WASTE_RECORD_TYPE[keyof typeof WASTE_RECORD_TYPE]} WasteRecordType */
