import { formatCurrency } from '#config/nunjucks/filters/format-currency.js'
import {
  formatTonnage,
  formatWholeNumberTonnage
} from '#config/nunjucks/filters/format-tonnage.js'
import {
  buildDestinationDetailRows,
  buildOverseasSiteRows,
  buildSupplierDetailRows,
  buildUnapprovedOverseasSiteRows,
  getTotalTonnageSentOn
} from './build-table-rows.js'
import { formatExportTonnages } from './format-export-tonnages.js'
import { orDash } from './format-or-dash.js'

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
 * @returns {{ supplierDetailRows: Array<Array<{text: string | null}>>, totalTonnage: string }}
 */
export const buildWasteReceivedViewData = (recyclingActivity) => ({
  supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers),
  totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived)
})

/**
 * Canonical waste-sent-on view data shared by the check, submit and view
 * pages: the formatted total and breakdown plus the 4-column destination table.
 * @param {ReportDetailResponse['wasteSent']} wasteSent
 * @returns {{
 *   destinationDetailRows: Array<Array<{text: string | null}>>,
 *   toExporters: string,
 *   toOtherSites: string,
 *   toReprocessors: string,
 *   totalTonnage: string
 * }}
 */
export const buildWasteSentOnViewData = (wasteSent) => ({
  destinationDetailRows: buildDestinationDetailRows(
    wasteSent.finalDestinations
  ),
  toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
  toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
  toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
  totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent))
})

/**
 * Canonical waste-exported view data shared by the check and submit pages:
 * approved/unapproved overseas site tables (no tonnage column) plus the
 * dash-defaulting export tonnage breakdown. A missing export activity renders
 * as a zeroed total with dashed breakdown values.
 * @param {ReportDetailResponse['exportActivity'] | undefined} exportActivity
 * @param {{ showApprovalColumn: boolean }} options
 * @returns {{
 *   overseasSiteRows: Array<Array<{ text: string | null }>>,
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
  { showApprovalColumn }
) => {
  const activity = exportActivity ?? emptyExportActivity

  return {
    overseasSiteRows: buildOverseasSiteRows(activity.overseasSites, {
      showApprovalColumn
    }),
    totalTonnage: formatTonnage(activity.totalTonnageExported),
    unapprovedOverseasSiteRows: buildUnapprovedOverseasSiteRows(
      activity.unapprovedOverseasSites
    ),
    ...formatExportTonnages(activity)
  }
}

/**
 * Canonical PRN/PERN summary values shared by the check, submit and view pages.
 * A report can still be incomplete on the editable check page, so an absent
 * value formats as a dash rather than a number.
 * @param {ReportDetailResponse['prn']} prn
 * @returns {{
 *   averagePricePerTonne: string,
 *   freeTonnage: string,
 *   issuedTonnage: string,
 *   totalRevenue: string
 * }}
 */
export const buildPrnSummaryViewData = (prn) => ({
  averagePricePerTonne: orDash(prn?.averagePricePerTonne, formatCurrency),
  freeTonnage: orDash(prn?.freeTonnage, formatWholeNumberTonnage),
  issuedTonnage: orDash(prn?.issuedTonnage, formatWholeNumberTonnage),
  totalRevenue: orDash(prn?.totalRevenue, formatCurrency)
})
