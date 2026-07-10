import { tonnageOrDash } from './dash-formatters.js'

/**
 * Extracts and formats the exporter tonnage breakdown fields from export activity.
 * Shared by check-your-answers and submit controllers.
 * @param {object} exportActivity
 * @returns {{ tonnageReceivedNotExported: string, tonnageRefused: string, tonnageStopped: string, tonnageRefusedOrStopped: string, tonnageRepatriated: string }}
 */
export function formatExportTonnages(exportActivity) {
  return {
    tonnageReceivedNotExported: tonnageOrDash(
      exportActivity.tonnageReceivedNotExported
    ),
    tonnageRefused: tonnageOrDash(exportActivity.tonnageRefusedAtDestination),
    tonnageStopped: tonnageOrDash(exportActivity.tonnageStoppedDuringExport),
    tonnageRefusedOrStopped: tonnageOrDash(
      exportActivity.totalTonnageRefusedOrStopped
    ),
    tonnageRepatriated: tonnageOrDash(exportActivity.tonnageRepatriated)
  }
}
