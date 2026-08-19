import { statusCodes } from '#server/common/constants/status-codes.js'

/**
 * Discriminator the backend sets on the 400 payload when report creation is
 * blocked because summary log rows are missing mandatory data (PAE-1420).
 */
export const REPORT_DATA_INCOMPLETE_REASON = 'report_data_incomplete'

/**
 * One missing mandatory field, as delivered on the wire.
 * @typedef {object} ReportDataIncompleteIssue
 * @property {string} sheet - Worksheet heading (summary log schema sheet name).
 * @property {string} rowId - User-facing Row ID value from the sheet.
 * @property {string} field - Canonical field name the frontend maps to copy.
 */

/**
 * The backend's report-data-incomplete 400 payload.
 * @typedef {object} ReportDataIncompletePayload
 * @property {string} [reason] - Present on the create-POST 400; absent on the
 *   GET-preview signal, which carries only the counts and issues.
 * @property {number} total - True number of missing fields; may exceed issues.
 * @property {ReportDataIncompleteIssue[]} issues - Capped list of missing fields.
 */

/**
 * True when the Boom error is the backend's report-data-incomplete 400, whose
 * payload carries the missing-field detail the screen renders.
 * @param {Boom} boomError
 * @returns {boolean}
 */
export const isReportDataIncompleteError = (boomError) =>
  Boolean(
    boomError.isBoom &&
    boomError.output.statusCode === statusCodes.badRequest &&
    /** @type {ReportDataIncompletePayload} */ (
      /** @type {unknown} */ (boomError.output.payload)
    )?.reason === REPORT_DATA_INCOMPLETE_REASON
  )

/**
 * Groups issues by worksheet in first-seen order, building a localised
 * "Row ID: X. Field is missing" bullet per missing field. Unknown field codes
 * fall back to the raw code so the screen never renders blank.
 * @param {ReportDataIncompleteIssue[]} issues
 * @param {LocaliseFn} localise
 * @returns {{ name: string, rows: string[] }[]}
 */
const groupIssuesBySheet = (issues, localise) => {
  /** @type {Map<string, string[]>} */
  const groups = new Map()
  for (const { sheet, rowId, field } of issues) {
    const fieldLabel = localise(`summary-log:columnHeader.${field}`, {
      defaultValue: field
    })
    const bullet = localise('reports:reportDataIncompleteRow', {
      rowId,
      field: fieldLabel
    })
    const rows = groups.get(sheet) ?? []
    rows.push(bullet)
    groups.set(sheet, rows)
  }
  return [...groups].map(([name, rows]) => ({ name, rows }))
}

/**
 * Builds the view model for the report-data-incomplete screen. The count line
 * gains a "can only display" clause when the true total exceeds the number of
 * issues delivered (the backend caps the list on a large summary log).
 * @param {ReportDataIncompletePayload} payload
 * @param {LocaliseFn} localise
 * @returns {{ heading: string, countLine: string, worksheets: { name: string, rows: string[] }[], helpLine: string }}
 */
export const buildReportDataIncompleteView = (payload, localise) => {
  const { total, issues } = payload
  const shown = issues.length
  const countLine =
    total > shown
      ? localise('reports:reportDataIncompleteCountCapped', { total, shown })
      : localise('reports:reportDataIncompleteCount', { count: total })

  return {
    heading: localise('reports:reportDataIncompleteHeading', { count: total }),
    countLine,
    worksheets: groupIssuesBySheet(issues, localise),
    helpLine: localise('reports:reportDataIncompleteHelp', { count: total })
  }
}

/**
 * @import { Boom } from '@hapi/boom'
 * @typedef {(key: string, opts?: object) => string} LocaliseFn
 */
