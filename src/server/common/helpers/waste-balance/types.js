/**
 * `decemberAmount`/`decemberAvailableAmount` are the December portions of
 * `amount`/`availableAmount`, additive and absent until a December portion
 * exists (see epr-backend's ledger-schema.js).
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
