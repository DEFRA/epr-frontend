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
 * @typedef {{
 *   failures: ValidationFailure[],
 *   totalIssuesCount?: number
 * }} ValidationResponse
 */

/**
 * A validation failure that pinpoints a specific spreadsheet cell. Narrowed
 * from {@link ValidationFailure} by the isLocatedCellError type guard, so the
 * location dimensions used for rendering are guaranteed present.
 * @typedef {{
 *   errorCode: string,
 *   actual?: unknown,
 *   location: {
 *     sheet: string,
 *     table: string,
 *     row: number,
 *     column: string,
 *     header: string,
 *     rowId?: string
 *   }
 * }} LocatedCellFailure
 */

/**
 * A single failing cell within a record (one table row, minus the ROW_ID which
 * is rowspanned across the record's cells).
 * @typedef {{
 *   columnLabel: string,
 *   value: string,
 *   problem: string
 * }} CellErrorCell
 */

/**
 * One record (ROW_ID) and its failing cells. The ROW_ID cell is rowspanned
 * across the cells.
 * @typedef {{
 *   rowId: string,
 *   cells: CellErrorCell[]
 * }} CellErrorRecord
 */

/**
 * Located cell errors for one table within a worksheet (one rendered table).
 * @typedef {{
 *   sectionLabel: string,
 *   records: CellErrorRecord[]
 * }} CellErrorSection
 */

/**
 * Located cell errors grouped by worksheet, then by table/section.
 * @typedef {{
 *   worksheetLabel: string,
 *   sections: CellErrorSection[]
 * }} CellErrorWorksheet
 */

/**
 * i18next translation function (Hapi `request.t`).
 * @typedef {(key: string, params?: object) => string} Localise
 */

/**
 * @typedef {{
 *   count: number,
 *   rowIds: string[]
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
 *   added: { count: number, rowIds: string[] },
 *   adjusted: { count: number, rowIds: string[] }
 * }} RegisteredOnlyLoadsSectionViewModel
 */

/**
 * @typedef {{
 *   accreditationNumber?: string,
 *   loads?: RawLoads,
 *   loadsByWasteRecordType?: RawLoadsByWasteRecordType,
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
