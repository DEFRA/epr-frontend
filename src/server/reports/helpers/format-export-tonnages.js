import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

/**
 * Extracts and formats the exporter tonnage breakdown fields from export activity.
 * Shared by check-your-answers and submit controllers. A missing value formats
 * as zero.
 * @param {object} exportActivity
 * @returns {{ tonnageReceivedNotExported: string, tonnageRefused: string, tonnageStopped: string, tonnageRefusedOrStopped: string, tonnageRepatriated: string }}
 */
export function formatExportTonnages(exportActivity) {
  return {
    tonnageReceivedNotExported: formatTonnage(
      exportActivity.tonnageReceivedNotExported
    ),
    tonnageRefused: formatTonnage(exportActivity.tonnageRefusedAtDestination),
    tonnageStopped: formatTonnage(exportActivity.tonnageStoppedDuringExport),
    tonnageRefusedOrStopped: formatTonnage(
      exportActivity.totalTonnageRefusedOrStopped
    ),
    tonnageRepatriated: formatTonnage(exportActivity.tonnageRepatriated)
  }
}
