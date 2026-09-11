/**
 * The available balance a raise draws on: the December pool when the PRN uses
 * it, else the derived non-December (`availableAmount - decemberAvailableAmount`),
 * which reserves December tonnage from a general raise. Mirrors epr-backend's
 * availableForPool (pool-balances.js) so the create-page radio tonnages and
 * the confirm-time recheck cannot disagree with what the backend will debit.
 * Absent December fields coalesce to 0, so a general balance behaves
 * byte-for-byte as it did before December waste existed.
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
