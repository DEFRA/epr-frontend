/**
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 */

/**
 * The events a registered-only ledger recorded during one year.
 *
 * A ledger is partitioned by accreditation and not by year, so the backend
 * answers the registered-only partition whole. This page is one page per
 * calendar year, so the narrowing is done here.
 *
 * The year is read in UTC, matching every other year this page takes off a
 * stored value. `createdAt` is a full ISO datetime rather than a bare date, so
 * it is parsed rather than compared as a string — unlike the day bounds in
 * `registered-only.js`, which are dates and sort as text.
 *
 * It narrows by when the submission was made, which is the only date a ledger
 * event carries. That is not the period the submission reports on: a log for
 * the last quarter of one year, sent in January, belongs to the year it was
 * sent in as far as this page is concerned.
 * @param {{ events: LedgerEvent[], year: number }} params
 * @returns {LedgerEvent[]}
 */
export const eventsInYear = ({ events, year }) =>
  events.filter((event) => new Date(event.createdAt).getUTCFullYear() === year)
