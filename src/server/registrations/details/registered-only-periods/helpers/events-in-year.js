/**
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 */

/**
 * The events a registered-only ledger recorded during one UTC year. The
 * backend answers the partition whole, and this page is one page per year.
 *
 * Narrows on when the submission was made - the only date an event carries -
 * not the period it reports on.
 * @param {{ events: LedgerEvent[], year: number }} params
 * @returns {LedgerEvent[]}
 */
export const eventsInYear = ({ events, year }) =>
  events.filter((event) => new Date(event.createdAt).getUTCFullYear() === year)
