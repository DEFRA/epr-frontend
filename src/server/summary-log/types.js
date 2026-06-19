/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { WasteRecordType } from '#domain/waste-records/model.js'
 */

/**
 * @typedef {{
 *   included: LoadRows,
 *   excluded: LoadRows,
 *   total: number
 * }} LoadCategoryViewModel
 */

/**
 * Full location of a validation failure within the uploaded spreadsheet.
 * `rowId` is the operator-facing ROW_ID ("load number"); `row` is the raw
 * spreadsheet row number; `column` is the Excel column letter.
 * @typedef {{
 *   sheet?: string,
 *   table?: string,
 *   row?: number,
 *   rowId?: string,
 *   column?: string,
 *   header?: string,
 *   field?: string
 * }} CellLocation
 */

/**
 * @typedef {{
 *   errorCode: string,
 *   code?: string,
 *   location?: CellLocation,
 *   actual?: unknown,
 *   expected?: unknown
 * }} ValidationFailure
 */

/**
 * Validation issue counts by severity, computed pre-cap on the backend.
 * @typedef {{
 *   fatal: number,
 *   error: number,
 *   warning: number,
 *   total: number
 * }} ValidationIssueCounts
 */

/**
 * @typedef {{
 *   failures: ValidationFailure[],
 *   counts: ValidationIssueCounts
 * }} ValidationResponse
 */

/**
 * A validation failure that pinpoints a specific spreadsheet cell. Narrowed
 * from {@link ValidationFailure} by the isLocatedCellError type guard, so the
 * location dimensions used for rendering are guaranteed present.
 * @typedef {{
 *   errorCode: string,
 *   actual?: string | number | boolean | null,
 *   location: {
 *     sheet: string,
 *     table: string,
 *     row: number,
 *     column: string,
 *     header: string,
 *     rowId: string
 *   }
 * }} LocatedCellFailure
 */

/**
 * A single failing cell within a record (one table row, minus the ROW_ID which
 * is rowspanned across the record's cells).
 * @typedef {{
 *   columnLabel: string,
 *   cellRef: string,
 *   value: string,
 *   problem: string
 * }} CellErrorCell
 */

/**
 * One record (ROW_ID) and its failing cells, rendered as a row group in the
 * single flat error table. The ROW_ID and section cells are rowspanned across
 * the record's cells. `section` is the (sheet, table) label.
 * @typedef {{
 *   rowId: string,
 *   section: string,
 *   cells: CellErrorCell[]
 * }} CellErrorRecord
 */

/**
 * i18next translation function (Hapi `request.t`).
 * @typedef {(key: string, params?: object) => string} Localise
 */

/**
 * Row identifier. Numeric in the sheet, but the backend coerces it to a string
 * on the wire (response.schema.js), so treat it as an opaque id, not a number.
 * @typedef {string} RowId
 */

/**
 * @typedef {{
 *   count: number,
 *   rowIds: RowId[]
 * }} LoadRows
 */

/**
 * @typedef {{
 *   added: LoadCategoryViewModel,
 *   adjusted: LoadCategoryViewModel
 * }} LoadsViewModel
 */

/**
 * @typedef {{
 *   valid: LoadRows,
 *   invalid: LoadRows,
 *   included: LoadRows,
 *   excluded: LoadRows
 * }} RawLoadCategory
 */

/**
 * @typedef {{
 *   valid: LoadRows
 * }} RawLoadValidOnly
 */

/**
 * @typedef {{
 *   added: RawLoadCategory,
 *   adjusted: RawLoadCategory
 *   unchanged: RawLoadCategory,
 * }} RawLoads
 */

/**
 * @typedef {{
 *   wasteRecordType: WasteRecordType,
 *   sheetName: string,
 *   added: RawLoadValidOnly,
 *   unchanged: RawLoadValidOnly,
 *   adjusted: RawLoadValidOnly
 * }} RawLoadsByWasteRecordTypeEntry
 */

/**
 * @typedef {RawLoadsByWasteRecordTypeEntry[]} RawLoadsByWasteRecordType
 */

/**
 * @typedef {{
 *   headingKey: string,
 *   sectionReference: string,
 *   added: { count: number, rowIds: RowId[] },
 *   adjusted: { count: number, rowIds: RowId[] }
 * }} RegisteredOnlyLoadsSectionViewModel
 */

/**
 * One listed load from a bucket: its identity, the distinct exclusion reason
 * codes (empty for an included load) and the signed tonnage this leg
 * contributed to the period balance (0 for a non-balance-affecting load).
 * @typedef {{
 *   rowId: RowId,
 *   wasteRecordType: WasteRecordType,
 *   exclusionReasons: string[],
 *   tonnageDelta: number
 * }} LoadRow
 */

/**
 * A load projected for display: the operator's worksheet (tab) name, the row
 * id, and the exclusion reason text (null when the load carries none).
 * @typedef {{
 *   worksheetName: string,
 *   rowId: RowId,
 *   reasonText: string | null
 * }} LoadRowViewModel
 */

/**
 * Balance-affecting bucket within a reporting-period change type. Carries the
 * tonnage that moves the waste balance; tonnageDelta can be negative
 * (adjustments reducing tonnage). The backend always sends a (capped) rows
 * array, but the frontend does not validate the response, so rows is treated
 * as optional and defended against at the consumption boundary.
 * @typedef {{ count: number, tonnageDelta: number, rows?: LoadRow[] }} BalanceAffectingBucket
 */

/**
 * View model for a balance-affecting bucket. The adjusted accordion splits its
 * rows into loads with all required data (the heading reflects the group's
 * direction) and loads still missing data (which always reduce the balance).
 * @typedef {{
 *   count: number,
 *   withData: { addsToBalance: boolean, rows: LoadRowViewModel[] },
 *   withoutData: { rows: LoadRowViewModel[] }
 * }} BalanceAffectingViewModel
 */

/**
 * Non-balance-affecting bucket. These loads do not move the waste balance, so
 * the backend sends count and rows only (no tonnage). Rows is optional for the
 * same trust-boundary reason as {@link BalanceAffectingBucket}.
 * @typedef {{ count: number, rows?: LoadRow[] }} NonBalanceAffectingBucket
 */

/**
 * @typedef {{
 *   balanceAffecting: BalanceAffectingBucket,
 *   nonBalanceAffecting: NonBalanceAffectingBucket
 * }} PeriodStatusByChange
 */

/**
 * @typedef {{
 *   added: PeriodStatusByChange,
 *   adjusted: PeriodStatusByChange
 * }} PeriodStatus
 */

/**
 * loadsByReportingPeriod payload from the backend. Required on the response
 * when status is VALIDATED, otherwise absent.
 * @typedef {{
 *   openPeriodLoads: PeriodStatus,
 *   closedPeriodLoads: PeriodStatus
 * }} LoadsByReportingPeriod
 */

/**
 * View model for one change type (added or adjusted) within a period. Null when
 * the total count is zero so the template hides the section.
 * @typedef {{
 *   count: number,
 *   absoluteTonnage: string,
 *   addsToBalance: boolean,
 *   hasTonnageDelta: boolean,
 *   balanceAffecting: BalanceAffectingViewModel,
 *   nonBalanceAffecting: { count: number, rows: LoadRowViewModel[] }
 * }} ChangeViewModel
 */

/**
 * View model for one period (open or closed). Null when both change types are
 * null so the template hides the whole period.
 * @typedef {{
 *   added: ChangeViewModel | null,
 *   adjusted: ChangeViewModel | null
 * }} PeriodViewModel
 */

/**
 * @typedef {{
 *   accreditationNumber?: string,
 *   loads?: RawLoads,
 *   loadsByWasteRecordType?: RawLoadsByWasteRecordType,
 *   loadsByReportingPeriod?: LoadsByReportingPeriod,
 *   processingType?: ProcessingType
 *   status: string,
 *   validation?: ValidationResponse,
 * }} SummaryLogStatusResponse
 */

/**
 * Route params for summary-log controllers.
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   summaryLogId: string
 * }} SummaryLogParams
 */

/**
 * Session data persisted under `sessionNames.summaryLogs`. `freshDataMap`
 * holds status responses written by submitSummaryLogController that
 * summaryLogUploadProgressController reads on the next request to bridge
 * backend replication lag.
 * @typedef {{
 *   freshDataMap?: Record<string, SummaryLogStatusResponse>
 * }} SummaryLogsSession
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
