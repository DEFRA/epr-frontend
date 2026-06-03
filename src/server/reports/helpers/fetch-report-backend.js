import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { SummaryLogChangedError } from './summary-log-changed.js'

const SUMMARY_LOG_CHANGED = 'summary_log_changed'

/**
 * Reporting-scoped wrapper around fetchJsonFromBackend.
 * Converts a 409 with code 'summary_log_changed' into a SummaryLogChangedError
 * so the Hapi onPreResponse lifecycle can redirect to the appropriate error page.
 * Applies to all HTTP methods (GET reads and PATCH/POST writes).
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<object | undefined>}
 */
export const fetchReportBackend = async (path, options) => {
  try {
    return await fetchJsonFromBackend(path, options)
  } catch (err) {
    if (
      err?.output?.statusCode === 409 &&
      err?.output?.payload?.code === SUMMARY_LOG_CHANGED
    ) {
      throw new SummaryLogChangedError(err.output.payload.code)
    }
    throw err
  }
}
