/**
 * The available balance a raise draws on: the December pool when the PRN
 * uses it, else the derived non-December (`availableAmount -
 * decemberAvailableAmount`), which reserves December tonnage from a general
 * raise. Mirrors epr-backend's availableForPool (pool-balances.js). Absent
 * December fields coalesce to 0.
 *
 * Only pass `useDecemberBalance: true` when the accreditation genuinely
 * routes to a December pool - a disclosure-only `isDecemberWaste` (PAE-1913)
 * is not pool routing.
 * @param {WasteBalance} balance
 * @param {boolean} [useDecemberBalance]
 * @returns {number}
 */
export const availableForPool = (balance, useDecemberBalance) =>
  useDecemberBalance
    ? (balance.decemberAvailableAmount ?? 0)
    : balance.availableAmount - (balance.decemberAvailableAmount ?? 0)

/**
 * @import { WasteBalance } from './types.js'
 */
