import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
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
 * @returns {{ totalTonnage: string, supplierDetailRows: Array<Array<{text: string | null}>> }}
 */
export const buildWasteReceivedViewData = (recyclingActivity) => ({
  totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
  supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
})

/**
 * Canonical waste-sent-on view data shared by the check, submit and view
 * pages: the formatted total and breakdown plus the 4-column destination table.
 * @param {ReportDetailResponse['wasteSent']} wasteSent
 * @returns {{
 *   totalTonnage: string,
 *   toReprocessors: string,
 *   toExporters: string,
 *   toOtherSites: string,
 *   destinationDetailRows: Array<Array<{text: string | null}>>
 * }}
 */
export const buildWasteSentOnViewData = (wasteSent) => ({
  totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent)),
  toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
  toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
  toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
  destinationDetailRows: buildDestinationDetailRows(wasteSent.finalDestinations)
})

/**
 * Canonical waste-exported view data shared by the check and submit pages:
 * approved/unapproved overseas site tables (no tonnage column) plus the
 * dash-defaulting export tonnage breakdown. A missing export activity renders
 * as a zeroed total with dashed breakdown values.
 * @param {ReportDetailResponse['exportActivity'] | undefined} exportActivity
 * @param {{ showApprovalColumn: boolean }} options
 * @returns {object}
 */
export const buildWasteExportedViewData = (
  exportActivity,
  { showApprovalColumn }
) => {
  const activity = exportActivity ?? emptyExportActivity

  return {
    totalTonnage: formatTonnage(activity.totalTonnageExported),
    overseasSiteRows: buildOverseasSiteRows(activity.overseasSites, {
      showApprovalColumn
    }),
    unapprovedOverseasSiteRows: buildUnapprovedOverseasSiteRows(
      activity.unapprovedOverseasSites
    ),
    ...formatExportTonnages(activity)
  }
}
