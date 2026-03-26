import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches aggregated report detail for a specific period from the backend.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {string} idToken
 * @returns {Promise<ReportDetailResponse>}
 */
export async function fetchReportDetail(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` }
  })
}

/**
 * @typedef {{
 *   supplierName: string,
 *   facilityType: string,
 *   tonnageReceived: number
 * }} SupplierEntry
 */

/**
 * @typedef {{
 *   recipientName: string,
 *   facilityType: string,
 *   tonnageSentOn: number
 * }} FinalDestinationEntry
 */

/**
 * @typedef {{
 *   siteName?: string,
 *   orsId: string
 * }} OverseasSiteEntry
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
 *   lastUploadedAt: string | null,
 *   details: {
 *     material: string,
 *     site?: { address: { line1: string, town: string, postcode: string } }
 *   },
 *   id?: string,
 *   version?: number,
 *   status?: string,
 *   supportingInformation?: string,
 *   recyclingActivity: {
 *     suppliers: SupplierEntry[],
 *     totalTonnageReceived: number,
 *     tonnageRecycled: number | null,
 *     tonnageNotRecycled: number | null
 *   },
 *   exportActivity?: {
 *     overseasSites: OverseasSiteEntry[],
 *     totalTonnageReceivedForExporting: number,
 *     tonnageReceivedNotExported: number | null,
 *     tonnageRefusedAtRecepientDestination: number | null,
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
