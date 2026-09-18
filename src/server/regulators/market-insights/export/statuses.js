/**
 * The states an export is in when it is asked for. The backend owns them; this
 * restates the contract so the pages decide from a name rather than a literal.
 *
 * There is no "requested": asking for a period that has no usable export is
 * what starts the build, so the first answer is already `building`.
 */
export const marketInsightsExportStatuses = Object.freeze({
  building: 'building',
  failed: 'failed',
  ready: 'ready'
})
