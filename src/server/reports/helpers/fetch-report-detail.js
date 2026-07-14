import { fetchReportBackend } from './fetch-report-backend.js'
import { ReportStaleError, staleReasons } from './stale.js'

/**
 * Fetches aggregated report detail for a specific period from the backend.
 * Throws {@link ReportStaleError} if the report is stale so callers get
 * a consistent error type regardless of whether staleness came from a GET 200
 * (stale field) or a PATCH/POST 409.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {number} submissionNumber
 * @param {string} idToken
 * @returns {Promise<ReportDetailResponse>}
 */
export async function fetchReportDetail(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  submissionNumber,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}/submissions/${submissionNumber}`

  const report = await fetchReportBackend(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` }
  })

  if (report.stale) {
    throw new ReportStaleError(staleReasons(report.stale))
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
 * @typedef {{
 *   operatorCategory: string,
 *   cadence: string,
 *   year: number,
 *   period: number,
 *   startDate: string,
 *   endDate: string,
 *   dueDate: string,
 *   source: { summaryLogId: string | null, lastUploadedAt: string | null },
 *   details: {
 *     material: string,
 *     site?: { address: { line1: string, town: string, postcode: string } }
 *   },
 *   id?: string,
 *   version?: number,
 *   status?: {
 *     currentStatus: string,
 *     currentStatusAt: string,
 *     created: { at: string, by: { id: string, name: string, position: string } },
 *     ready?: { at: string, by: { id: string, name: string, position: string } },
 *     submitted?: { at: string, by: { id: string, name: string, position: string } }
 *   },
 *   stale?: {
 *     summaryLogChanged?: { uploadedAt: string, summaryLogId: string },
 *     prnCancelled?: { occurredAt: string, prnId: string }
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
