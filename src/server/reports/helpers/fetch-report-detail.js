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
 *   role: string,
 *   tonnage: number
 * }} SupplierEntry
 */

/**
 * @typedef {{
 *   recipientName: string,
 *   role: string,
 *   tonnage: number
 * }} DestinationEntry
 */

/**
 * @typedef {{
 *   siteName?: string,
 *   osrId: string
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
 *   lastUploadedAt: string | null,
 *   details: {
 *     material: string,
 *     site?: { address: { line1: string, town: string, postcode: string } }
 *   },
 *   sections: {
 *     wasteReceived: {
 *       totalTonnage: number,
 *       suppliers: SupplierEntry[]
 *     },
 *     wasteExported?: {
 *       totalTonnage: number,
 *       overseasSites: OverseasSiteEntry[]
 *     },
 *     wasteSentOn: {
 *       totalTonnage: number,
 *       toReprocessors: number,
 *       toExporters: number,
 *       toOtherSites: number,
 *       destinations: DestinationEntry[]
 *     }
 *   }
 * }} ReportDetailResponse
 */
