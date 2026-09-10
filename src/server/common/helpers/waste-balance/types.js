/**
 * The December fields are only present for an accreditation whose balance
 * carries a December portion; the backend omits them entirely otherwise.
 * @typedef {{
 *   amount: number
 *   availableAmount: number
 *   decemberAmount?: number
 *   decemberAvailableAmount?: number
 * }} WasteBalance
 */

/**
 * @typedef {Record<string, WasteBalance>} WasteBalanceMap
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
