import {
  formatTonnage,
  formatWholeNumberTonnage
} from '#config/nunjucks/filters/format-tonnage.js'
import { formatCurrency } from '#server/common/helpers/format-currency.js'
import {
  buildDestinationDetailRows,
  buildOverseasSiteRows,
  buildSupplierDetailRows,
  buildUnapprovedOverseasSiteRows,
  getTotalTonnageSentOn
} from './build-table-rows.js'
import { formatExportTonnages } from './format-export-tonnages.js'

/**
 * @import { ReportDetailResponse } from './fetch-report-detail.js'
 */

/** @type {NonNullable<ReportDetailResponse['exportActivity']>} */
const emptyExportActivity = {
  totalTonnageExported: 0,
  overseasSites: [],
  unapprovedOverseasSites: [],
  tonnageReceivedNotExported: null,
  tonnageRefusedAtDestination: null,
  tonnageStoppedDuringExport: null,
  totalTonnageRefusedOrStopped: null,
  tonnageRepatriated: null
}

/**
 * Canonical waste-received view data shared by the check, submit and view
 * pages: the formatted total plus the 5-column supplier contact table.
 * @param {ReportDetailResponse['recyclingActivity']} recyclingActivity
 * @param {string} fallbackText
 * @returns {{ supplierDetailRows: Array<Array<{text: string}>>, totalTonnage: string }}
 */
export const buildWasteReceivedViewData = (
  recyclingActivity,
  fallbackText
) => ({
  supplierDetailRows: buildSupplierDetailRows(
    recyclingActivity.suppliers,
    fallbackText
  ),
  totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived)
})

/**
 * Canonical waste-sent-on view data shared by the check, submit and view
 * pages: the formatted total and breakdown plus the 4-column destination table.
 * @param {ReportDetailResponse['wasteSent']} wasteSent
 * @param {string} fallbackText
 * @returns {{
 *   destinationDetailRows: Array<Array<{text: string}>>,
 *   toExporters: string,
 *   toOtherSites: string,
 *   toReprocessors: string,
 *   totalTonnage: string
 * }}
 */
export const buildWasteSentOnViewData = (wasteSent, fallbackText) => ({
  destinationDetailRows: buildDestinationDetailRows(
    wasteSent.finalDestinations,
    fallbackText
  ),
  toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
  toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
  toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
  totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent))
})

/**
 * Canonical waste-exported view data shared by the check and submit pages:
 * approved/unapproved overseas site tables (no tonnage column) plus the
 * export tonnage breakdown. A missing export activity renders as a zeroed
 * total with zeroed breakdown values.
 * @param {ReportDetailResponse['exportActivity'] | undefined} exportActivity
 * @param {{ showApprovalColumn: boolean }} options
 * @param {string} fallbackText
 * @returns {{
 *   overseasSiteRows: Array<Array<{ text: string }>>,
 *   tonnageReceivedNotExported: string,
 *   tonnageRefused: string,
 *   tonnageRefusedOrStopped: string,
 *   tonnageRepatriated: string,
 *   tonnageStopped: string,
 *   totalTonnage: string,
 *   unapprovedOverseasSiteRows: Array<Array<{ text: string }>>
 * }}
 */
export const buildWasteExportedViewData = (
  exportActivity,
  { showApprovalColumn },
  fallbackText
) => {
  const activity = exportActivity ?? emptyExportActivity

  return {
    overseasSiteRows: buildOverseasSiteRows(
      activity.overseasSites,
      { showApprovalColumn },
      fallbackText
    ),
    totalTonnage: formatTonnage(activity.totalTonnageExported),
    unapprovedOverseasSiteRows: buildUnapprovedOverseasSiteRows(
      activity.unapprovedOverseasSites
    ),
    ...formatExportTonnages(activity)
  }
}

/**
 * Canonical PRN/PERN summary values shared by the check, submit and view pages.
 * A missing value formats as zero, consistent with the rest of the report.
 * @param {ReportDetailResponse['prn']} prn
 * @returns {{
 *   averagePricePerTonne: string,
 *   freeTonnage: string,
 *   issuedTonnage: string,
 *   totalRevenue: string
 * }}
 */
export const buildPrnSummaryViewData = (prn) => ({
  averagePricePerTonne: formatCurrency(prn?.averagePricePerTonne),
  freeTonnage: formatWholeNumberTonnage(prn?.freeTonnage),
  issuedTonnage: formatWholeNumberTonnage(prn?.issuedTonnage),
  totalRevenue: formatCurrency(prn?.totalRevenue)
})
