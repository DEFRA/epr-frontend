export class SummaryLogChangedError extends Error {
  /**
   * @param {string} reason - The invalidation reason code from the backend (e.g. 'summary_log_changed')
   */
  constructor(reason) {
    super('Summary log has changed')
    this.name = 'SummaryLogChangedError'
    this.reason = reason
  }
}
