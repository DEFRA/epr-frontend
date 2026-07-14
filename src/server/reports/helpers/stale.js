/**
 * Reason codes for a stale report, mirroring epr-backend
 * `src/reports/domain/stale.js`'s `STALE_REASON`. A report can be stale for
 * either or both reasons at once (ADR-0042), so the backend's 409/GET
 * payload carries these as an array, never a single string.
 */
export const STALE_REASON = Object.freeze({
  SUMMARY_LOG_CHANGED: 'summary_log_changed',
  PRN_CANCELLED: 'prn_cancelled'
})

export class ReportStaleError extends Error {
  /**
   * @param {string[]} reasons - The invalidation reason codes from the backend
   */
  constructor(reasons) {
    super('Report is stale')
    this.name = 'ReportStaleError'
    this.reasons = reasons
  }
}

/**
 * Derives which stale reasons apply from the named fields present on a
 * report's `stale` object. Mirrors the backend's own `staleReasons()` in
 * `reports/domain/stale.js`.
 * @param {{ summaryLogChanged?: object, prnCancelled?: object }} stale
 * @returns {string[]}
 */
export const staleReasons = (stale) => {
  const reasons = []
  if (stale.summaryLogChanged) {
    reasons.push(STALE_REASON.SUMMARY_LOG_CHANGED)
  }
  if (stale.prnCancelled) {
    reasons.push(STALE_REASON.PRN_CANCELLED)
  }
  return reasons
}

const KNOWN_STALE_REASONS = /** @type {string[]} */ (
  Object.values(STALE_REASON)
)

/**
 * Derives stale reasons from a 409's `code`, which is normally an array but a
 * bare string is also accepted for backward compatibility with a backend
 * build older than PAE-1698. Returns [] for anything else (including a
 * missing `code`), since a 409's `code` isn't necessarily a stale reason at
 * all (e.g. a version-conflict code).
 * @param {unknown} code
 * @returns {string[]}
 */
export const staleReasonsFromCode = (code) => {
  const codes = typeof code === 'string' ? [code] : code
  if (!Array.isArray(codes)) {
    return []
  }
  return codes.filter((reason) => KNOWN_STALE_REASONS.includes(reason))
}
