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
 * @typedef {{
 *   errorCode: string,
 *   location?: { header?: string, sheet?: string }
 * }} ValidationFailure
 */

/**
 * @typedef {{
 *   failures: ValidationFailure[]
 * }} ValidationResponse
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
