/**
 * The available balance a raise draws on: the December pool when the PRN
 * uses it, else the backend-derived non-December remainder, which reserves
 * December tonnage from a general raise. Both fields are absent until the
 * accreditation holds a December portion, and coalesce to 0.
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
    : (balance.nonDecemberAvailableAmount ?? balance.availableAmount)

/**
 * @import { WasteBalance } from './types.js'
 */
