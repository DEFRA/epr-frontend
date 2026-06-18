import { ROW_ID_MINIMUM } from './reference-data.js'

const COUNTER_KEY = 'receivedLoadNextRowId'

/**
 * Assigns the next ROW_ID for a completed load.
 *
 * ROW_IDs are sequential integers from a per-table offset, matching how the
 * summary log spreadsheet auto-generates them. The counter lives in the
 * session so adding several loads in one sitting yields consecutive IDs.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {number}
 */
export const assignRowId = (request) => {
  const stored = request.yar.get(COUNTER_KEY)
  const rowId = typeof stored === 'number' ? stored : ROW_ID_MINIMUM
  request.yar.set(COUNTER_KEY, rowId + 1)
  return rowId
}
