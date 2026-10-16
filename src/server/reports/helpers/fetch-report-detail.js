import { reportBackend } from './report-backend.js'
import { reportApiPath } from './report-paths.js'
import { ReportStaleError, staleReasons } from './stale.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Fetches aggregated report detail for a specific period from the backend.
 * Throws {@link ReportStaleError} if the report is stale so callers get
 * a consistent error type regardless of whether staleness came from a GET 200
 * (stale field) or a PATCH/POST 409.
 * @param {SubmissionKeys} keys
 * @param {string} backendToken
 * @returns {Promise<ReportDetailResponse>}
 */
export async function fetchReportDetail(keys, backendToken) {
  /** @type {ReportDetailResponse} */
  const report = await reportBackend(backendToken).get(reportApiPath(keys))

  const reasons = staleReasons(report.stale)
  if (reasons.length > 0) {
    throw new ReportStaleError(reasons)
  }

  return report
}

/**
 * @typedef {{
 *   supplierName: string | null,
 *   facilityType: string | null,
 *   tonnageReceived: number,
 *   supplierAddress: string | null,
 *   supplierPhone: string | null,
 *   supplierEmail: string | null
 * }} SupplierEntry
 */

/**
 * @typedef {{
 *   recipientName: string | null,
 *   facilityType: string | null,
 *   address: string | null,
 *   tonnageSentOn: number
 * }} FinalDestinationEntry
 */

/**
 * @typedef {{
 *   siteName: string,
 *   orsId: string,
 *   country: string | null,
 *   tonnageExported: number,
 *   approved: boolean
 * }} OverseasSiteEntry
 */

/**
 * @typedef {{
 *   orsId: string,
 *   tonnageExported: number
 * }} UnapprovedOverseasSiteEntry
 */

/**
 * @typedef {{ name?: string, position: string }} ReportPerson
 */

/**
 * The natural-key report resource; `status` is `not_started` for a preview.
 * @typedef {{
 *   cadence: string,
 *   year: number,
 *   period: number,
 *   submissionNumber: number,
 *   startDate: string,
 *   endDate: string,
 *   dueDate?: string,
 *   source?: { summaryLogId: string, lastUploadedAt: string | null },
 *   status: string,
 *   createdAt?: string,
 *   createdBy?: ReportPerson,
 *   submittedAt?: string,
 *   submittedBy?: ReportPerson,
 *   version?: number,
 *   stale?: {
 *     summaryLogChanged?: { uploadedAt: string },
 *     prnCancelled?: { occurredAt: string }
 *   },
 *   canRequestResubmission: boolean,
 *   incompleteSummaryLogRows?: {
 *     total: number,
 *     issues: { sheet: string, rowId: string, field: string }[]
 *   },
 *   resubmissionRequired?: {
 *     operatorRequested?: {
 *       requestedAt: string,
 *       requestedBy: ReportPerson
 *     },
 *     closedPeriodRestated?: { uploadedAt: string }
 *   },
 *   supportingInformation?: string,
 *   prn?: {
 *     issuedTonnage: number,
 *     freeTonnage: number | null,
 *     totalRevenue: number | null,
 *     averagePricePerTonne: number | null
 *   },
 *   recyclingActivity: {
 *     suppliers: SupplierEntry[],
 *     totalTonnageReceived: number,
 *     tonnageRecycled: number | null,
 *     tonnageNotRecycled: number | null
 *   },
 *   exportActivity?: {
 *     overseasSites: OverseasSiteEntry[],
 *     unapprovedOverseasSites: UnapprovedOverseasSiteEntry[],
 *     totalTonnageExported: number,
 *     tonnageReceivedNotExported: number|null,
 *     totalTonnageRefusedOrStopped: number | null,
 *     tonnageRefusedAtDestination: number | null,
 *     tonnageStoppedDuringExport: number | null,
 *     tonnageRepatriated: number | null
 *   },
 *   wasteSent: {
 *     tonnageSentToReprocessor: number,
 *     tonnageSentToExporter: number,
 *     tonnageSentToAnotherSite: number,
 *     finalDestinations: FinalDestinationEntry[]
 *   }
 * }} ReportDetailResponse
 */
