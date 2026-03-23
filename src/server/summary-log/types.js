/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
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
 *   location?: { header?: string }
 * }} ValidationFailure
 */

/**
 * @typedef {{
 *   failures: ValidationFailure[]
 * }} ValidationResponse
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
 *   added: RawLoadCategory,
 *   adjusted: RawLoadCategory
 *   unchanged: RawLoadCategory,
 * }} RawLoads
 */

/**
 * @typedef {{
 *   accreditationNumber?: string,
 *   loads?: RawLoads,
 *   processingType?: ProcessingType
 *   status: string,
 *   validation?: ValidationResponse,
 * }} SummaryLogStatusResponse
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
