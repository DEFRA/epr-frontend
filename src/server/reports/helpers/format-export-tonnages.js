import { dashTonnes } from './dash-formatters.js'

/**
 * Extracts and formats the exporter tonnage breakdown fields from export activity.
 * Shared by check-your-answers and submit controllers.
 * @param {object} exportActivity
 * @returns {{ tonnageReceivedNotExported: string, tonnageRefused: string, tonnageStopped: string, tonnageRefusedOrStopped: string, tonnageRepatriated: string }}
 */
export function formatExportTonnages(exportActivity) {
  return {
    tonnageReceivedNotExported: dashTonnes(
      exportActivity.tonnageReceivedNotExported
    ),
    tonnageRefused: dashTonnes(exportActivity.tonnageRefusedAtDestination),
    tonnageStopped: dashTonnes(exportActivity.tonnageStoppedDuringExport),
    tonnageRefusedOrStopped: dashTonnes(
      exportActivity.totalTonnageRefusedOrStopped
    ),
    tonnageRepatriated: dashTonnes(exportActivity.tonnageRepatriated)
  }
}
