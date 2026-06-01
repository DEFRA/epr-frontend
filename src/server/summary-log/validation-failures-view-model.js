import {
  getDisplayCodeFromErrorCode,
  TECHNICAL_ERROR_DISPLAY_CODE
} from '#server/common/constants/validation-codes.js'
import { partition } from 'lodash-es'

/**
 * @import {
 *   CellErrorCell,
 *   CellErrorRecord,
 *   Localise,
 *   LocatedCellFailure,
 *   ValidationFailure,
 *   ValidationResponse
 * } from './types.js'
 */

const MAX_FILE_SIZE_MB = 100

// Front-end display slice: we render at most this many located cell errors in
// the table (the backend returns up to its own larger cap). When the true total
// (validation.counts.fatal) exceeds this, we tell the operator only the first N
// are shown.
const VALIDATION_ISSUE_DISPLAY_CAP = 50

const buildRowRemovedIssue = (rowRemovedFailures, localise) => {
  if (rowRemovedFailures.length === 0) {
    return []
  }

  const sheets = [
    ...new Set(
      rowRemovedFailures.map(({ location }) => location?.sheet ?? 'Unknown')
    )
  ]

  return [
    {
      type: 'sequentialRowRemoved',
      preamble: localise('summary-log:failure.SEQUENTIAL_ROW_REMOVED_PREAMBLE'),
      sheets,
      closing: localise('summary-log:failure.SEQUENTIAL_ROW_REMOVED_CLOSING')
    }
  ]
}

const buildOtherIssueMessages = (otherFailures, localise, fallbackMessage) => {
  if (otherFailures.length === 0) {
    return []
  }

  return [
    ...new Set(
      otherFailures.map(({ errorCode, location }) => {
        const displayCode = getDisplayCodeFromErrorCode(
          errorCode,
          location?.header
        )
        return localise(`summary-log:failure.${displayCode}`, {
          defaultValue: fallbackMessage,
          maxSize: MAX_FILE_SIZE_MB
        })
      })
    )
  ]
}

const applyFallback = (combinedIssues, fallbackMessage) => {
  if (combinedIssues.length === 0) {
    return [fallbackMessage]
  }

  if (combinedIssues.length > 1) {
    return combinedIssues.filter((issue) => issue !== fallbackMessage)
  }

  return combinedIssues
}

/**
 * A failure is a located cell error when it pinpoints a specific spreadsheet
 * cell (sheet, table, row, column and header). Other failures are meta/file-
 * level and keep the existing category-message rendering.
 * @param {ValidationFailure} failure
 * @returns {failure is LocatedCellFailure}
 */
const isLocatedCellError = (failure) => {
  const location = failure?.location

  return Boolean(
    location?.sheet &&
    location?.table &&
    typeof location?.row === 'number' &&
    location?.column &&
    location?.header
  )
}

/**
 * @param {ValidationFailure} failure
 * @returns {boolean}
 */
const isSequentialRowRemoved = ({ errorCode }) =>
  errorCode === 'SEQUENTIAL_ROW_REMOVED'

/**
 * Sorts ROW_IDs numerically. They arrive as numeric strings (enforced by
 * rowIdSchema) and are unique only within a table.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const compareRowId = (a, b) => Number(a) - Number(b)

/**
 * @param {string} header - Column header code (e.g. NET_WEIGHT)
 * @param {Localise} localise
 * @returns {string} Human label, e.g. "Net weight"
 */
const buildColumnLabel = (header, localise) =>
  localise(`summary-log:columnHeader.${header}`, { defaultValue: header })

/**
 * @param {string | number | boolean | null | undefined} actual - The value the operator entered
 * @param {Localise} localise
 * @returns {string}
 */
const formatCellValue = (actual, localise) => {
  if (actual === undefined || actual === null || actual === '') {
    return localise('summary-log:cellEmptyValue')
  }

  return String(actual)
}

/**
 * @param {LocatedCellFailure} failure
 * @param {Localise} localise
 * @returns {CellErrorCell}
 */
const buildCellErrorCell = (failure, localise) => {
  const { location, errorCode, actual } = failure
  const displayCode = getDisplayCodeFromErrorCode(errorCode, location.header)

  return {
    columnLabel: buildColumnLabel(location.header, localise),
    cellRef: `${location.column}${location.row}`,
    value: formatCellValue(actual, localise),
    problem: localise(`summary-log:cellReason.${errorCode}`, {
      defaultValue: localise(`summary-log:cellReason.${displayCode}`, {
        defaultValue: localise('summary-log:cellReason.DATA_ENTRY_INVALID')
      })
    })
  }
}

/**
 * The operator-facing ROW_ID ("load number"). The backend always emits it for
 * located cell errors (a loads-table row is a load), enforced by rowIdSchema.
 * @param {LocatedCellFailure} failure
 * @returns {string}
 */
const rowIdOf = ({ location }) => location.rowId

/**
 * One record: a ROW_ID, its (sheet, table) section label and its failing cells
 * (the ROW_ID and section cells are rowspanned across them in the view).
 * @param {string} rowId
 * @param {string} section
 * @param {LocatedCellFailure[]} failures - This record's failures
 * @param {Localise} localise
 * @returns {CellErrorRecord}
 */
const buildCellErrorRecord = (rowId, section, failures, localise) => ({
  rowId,
  section,
  cells: failures.map((failure) => buildCellErrorCell(failure, localise))
})

/**
 * One table's records: failures grouped by ROW_ID and sorted (numerically where
 * possible), each carrying the table's section label. ROW_IDs are unique only
 * within a (sheet, table).
 * @param {string} table
 * @param {LocatedCellFailure[]} failures - This table's failures
 * @param {string} sheet - Section label fallback when the table is unmapped
 * @param {Localise} localise
 * @returns {CellErrorRecord[]}
 */
const buildTableRecords = (table, failures, sheet, localise) => {
  const section = localise(`summary-log:tableLabel.${table}`, {
    defaultValue: sheet
  })

  return [...Map.groupBy(failures, rowIdOf)]
    .map(([rowId, recordFailures]) =>
      buildCellErrorRecord(rowId, section, recordFailures, localise)
    )
    .toSorted((a, b) => compareRowId(a.rowId, b.rowId))
}

/**
 * Flattens located cell errors into a single ordered record list for the flat
 * table — grouped by sheet then table (preserving encounter order), records
 * sorted by ROW_ID within each table, each carrying its section label.
 * @param {LocatedCellFailure[]} locatedFailures
 * @param {Localise} localise
 * @returns {CellErrorRecord[]}
 */
const buildCellErrorRecords = (locatedFailures, localise) =>
  [...Map.groupBy(locatedFailures, ({ location }) => location.sheet)].flatMap(
    ([sheet, sheetFailures]) =>
      [...Map.groupBy(sheetFailures, ({ location }) => location.table)].flatMap(
        ([table, tableFailures]) =>
          buildTableRecords(table, tableFailures, sheet, localise)
      )
  )

/**
 * Builds the validation-failures view model: the flat located-cell-error
 * records (sliced to the display cap), the remaining meta/file-level issue
 * messages, and the count/cap-aware description lines.
 * @param {Localise} localise
 * @param {ValidationResponse} [validation]
 * @returns {{
 *   errorRecords: CellErrorRecord[],
 *   issues: Array<string | object>,
 *   description1: string,
 *   description2: string
 * }}
 */
export const buildValidationFailuresViewModel = (localise, validation) => {
  const failures = validation?.failures ?? []

  const fallbackMessage = localise(
    `summary-log:failure.${TECHNICAL_ERROR_DISPLAY_CODE}`
  )

  const [locatedFailures, nonLocatedFailures] = partition(
    failures,
    isLocatedCellError
  )

  const [rowRemovedFailures, otherFailures] = partition(
    nonLocatedFailures,
    isSequentialRowRemoved
  )

  const combinedIssues = [
    ...buildRowRemovedIssue(rowRemovedFailures, localise),
    ...buildOtherIssueMessages(otherFailures, localise, fallbackMessage)
  ]

  const issues =
    locatedFailures.length > 0
      ? combinedIssues
      : applyFallback(combinedIssues, fallbackMessage)

  const issueCount = locatedFailures.length + issues.length

  // counts.fatal is the true pre-cap total (the backend caps the returned
  // failures array); fall back to the rendered count when it is absent (e.g.
  // file-level rejections, which never approach the cap).
  const totalErrors = validation?.counts?.fatal ?? issueCount
  const capped = totalErrors > VALIDATION_ISSUE_DISPLAY_CAP

  // Display only the first N located errors; the message names the true total.
  const errorRecords = buildCellErrorRecords(
    locatedFailures.slice(0, VALIDATION_ISSUE_DISPLAY_CAP),
    localise
  )

  const description1 = capped
    ? localise('summary-log:validationFailuresDescription1Capped', {
        total: totalErrors,
        cap: VALIDATION_ISSUE_DISPLAY_CAP
      })
    : localise('summary-log:validationFailuresDescription1', {
        count: totalErrors
      })

  const description2 = localise('summary-log:validationFailuresDescription2', {
    count: totalErrors
  })

  return { errorRecords, issues, description1, description2 }
}
