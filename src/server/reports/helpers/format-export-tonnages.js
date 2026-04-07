import { formatTonnageOrDash } from './format-tonnage-or-dash.js'

/**
 * Extracts and formats the exporter tonnage breakdown fields from export activity.
 * Shared by check-your-answers and submit controllers.
 * @param {object} exportActivity
 * @returns {{ tonnageReceivedNotExported: string, tonnageRefused: string, tonnageStopped: string, tonnageRefusedOrStopped: string, tonnageRepatriated: string }}
 */
export function formatExportTonnages(exportActivity) {
  return {
    tonnageReceivedNotExported: formatTonnageOrDash(
      exportActivity.tonnageReceivedNotExported
    ),
    tonnageRefused: formatTonnageOrDash(
      exportActivity.tonnageRefusedAtDestination
    ),
    tonnageStopped: formatTonnageOrDash(
      exportActivity.tonnageStoppedDuringExport
    ),
    tonnageRefusedOrStopped: formatTonnageOrDash(
      exportActivity.totalTonnageRefusedOrStopped
    ),
    tonnageRepatriated: formatTonnageOrDash(exportActivity.tonnageRepatriated)
  }
}
