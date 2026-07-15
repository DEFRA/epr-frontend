import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { StatusCodes } from 'http-status-codes'
import { ReportStaleError, staleReasonsFromCode } from './stale.js'

/**
 * Reporting-scoped wrapper around fetchJsonFromBackend.
 * Converts a 409 carrying stale-reason code(s) into a ReportStaleError so the
 * Hapi onPreResponse lifecycle can redirect to the report-stale error page.
 * Applies to all HTTP methods (GET reads and PATCH/POST writes).
 * A 409's `code` isn't necessarily a stale reason (e.g. a version-conflict
 * code) — `staleReasonsFromCode` filters out anything unrecognised, so only a
 * non-empty result confirms this 409 really is report staleness.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<object | undefined>}
 */
export const fetchReportBackend = async (path, options) => {
  try {
    return await fetchJsonFromBackend(path, options)
  } catch (err) {
    if (err?.output?.statusCode === StatusCodes.CONFLICT) {
      const reasons = staleReasonsFromCode(err.output.payload?.code)
      if (reasons.length > 0) {
        throw new ReportStaleError(reasons)
      }
    }
    throw err
  }
}
