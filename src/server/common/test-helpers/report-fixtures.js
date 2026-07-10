/**
 * @import { ReportDetailResponse, SupplierEntry, FinalDestinationEntry } from '#server/reports/helpers/fetch-report-detail.js'
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

/**
 * Casts a partial mock object to the `SupplierEntry` shape on report detail.
 * @param {unknown} data
 * @returns {SupplierEntry}
 */
export const asSupplierEntry = (data) => /** @type {SupplierEntry} */ (data)

/**
 * Casts a partial mock object to the `FinalDestinationEntry` shape on report
 * detail.
 * @param {unknown} data
 * @returns {FinalDestinationEntry}
 */
export const asFinalDestinationEntry = (data) =>
  /** @type {FinalDestinationEntry} */ (data)
