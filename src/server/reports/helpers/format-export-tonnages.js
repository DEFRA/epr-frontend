import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { orDash } from './format-or-dash.js'

/**
 * Extracts and formats the exporter tonnage breakdown fields from export activity.
 * Shared by check-your-answers and submit controllers.
 * @param {object} exportActivity
 * @returns {{ tonnageReceivedNotExported: string, tonnageRefused: string, tonnageStopped: string, tonnageRefusedOrStopped: string, tonnageRepatriated: string }}
 */
export function formatExportTonnages(exportActivity) {
  return {
    tonnageReceivedNotExported: orDash(
      exportActivity.tonnageReceivedNotExported,
      formatTonnage
    ),
    tonnageRefused: orDash(
      exportActivity.tonnageRefusedAtDestination,
      formatTonnage
    ),
    tonnageStopped: orDash(
      exportActivity.tonnageStoppedDuringExport,
      formatTonnage
    ),
    tonnageRefusedOrStopped: orDash(
      exportActivity.totalTonnageRefusedOrStopped,
      formatTonnage
    ),
    tonnageRepatriated: orDash(exportActivity.tonnageRepatriated, formatTonnage)
  }
}
