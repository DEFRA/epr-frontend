import { formatTonnageOrDash } from './format-tonnage-or-dash.js'

/**
 * Extracts and formats the exporter tonnage breakdown fields from export activity.
 * Shared by check-your-answers and submit controllers.
 * @param {object} exportActivity
 * @returns {{ tonnageReceivedNotExported: string, tonnageRefused: string, tonnageStopped: string, tonnageRefusedOrStopped: string, tonnageRepatriated: string }}
 */
export function formatExportTonnages(exportActivity) {
  const tonnageReceivedNotExported = exportActivity.tonnageReceivedNotExported
  const tonnageRefused = exportActivity.tonnageRefusedAtRecepientDestination
  const tonnageStopped = exportActivity.tonnageStoppedDuringExport
  const tonnageRefusedOrStopped =
    tonnageRefused === null && tonnageStopped === null
      ? null
      : (tonnageRefused ?? 0) + (tonnageStopped ?? 0)
  const tonnageRepatriated = exportActivity.tonnageRepatriated

  return {
    tonnageReceivedNotExported: formatTonnageOrDash(tonnageReceivedNotExported),
    tonnageRefused: formatTonnageOrDash(tonnageRefused),
    tonnageStopped: formatTonnageOrDash(tonnageStopped),
    tonnageRefusedOrStopped: formatTonnageOrDash(tonnageRefusedOrStopped),
    tonnageRepatriated: formatTonnageOrDash(tonnageRepatriated)
  }
}
