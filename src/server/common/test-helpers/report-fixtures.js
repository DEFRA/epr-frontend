/**
 * @import { ReportDetailResponse } from '#server/reports/helpers/fetch-report-detail.js'
 */

/**
 * Casts a partial mock object to the `ReportDetailResponse` shape that
 * `fetchReportDetail` resolves, so tests can supply only the fields the code
 * path under test reads.
 * @param {unknown} data
 * @returns {ReportDetailResponse}
 */
export const asReportDetailResponse = (data) =>
  /** @type {ReportDetailResponse} */ (data)
