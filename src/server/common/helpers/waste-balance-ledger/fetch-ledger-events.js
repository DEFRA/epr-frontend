import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import {
  accreditationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

/** @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js' */

/**
 * What every entry of a waste balance ledger states, whichever thing it
 * concerns.
 *
 * `balance` carries the running totals either side of the event. Both pairs
 * are declared, because the page states what an event moved as well as what it
 * left behind, and the movement is the difference between the two.
 *
 * An actor carries an id and nothing else for certain. A machine writer has no
 * email, and a record written before a name was captured has no name, so the
 * page must read an actor that holds only one of the two.
 * @typedef {{
 *   kind: string,
 *   createdAt: string,
 *   createdBy: { id: string, name?: string, email?: string },
 *   balance: {
 *     opening: { total: number, available: number },
 *     closing: { total: number, available: number }
 *   }
 * }} LedgerEventCommon
 */

/**
 * An entry that credits a submitted summary log. `creditTotal` is the running
 * total the period stands at once this submission is counted, not the amount
 * the balance moved: a resubmission states a new total and moves the balance
 * by the difference against the last one.
 * `summaryLog.id` is the id of the uploaded file, not of the log holding it.
 * @typedef {LedgerEventCommon & {
 *   summaryLog: { id: string, creditTotal: number },
 *   prn?: never
 * }} SummaryLogEvent
 */

/**
 * An entry that concerns a single note. `tonnage` is the tonnage of the note
 * itself, which the page does not show: what it shows is the amount the
 * balance moved, and issuing a note moves the available balance by nothing.
 *
 * `id` addresses the note, so the entry can offer a way into it. `prnNumber`
 * is the number the note is known by, which it is given when it is issued and
 * so does not have for its whole life.
 * @typedef {LedgerEventCommon & {
 *   prn: { id: string, prnNumber: string | null, tonnage: number },
 *   summaryLog?: never
 * }} PrnEvent
 */

/**
 * @typedef {SummaryLogEvent | PrnEvent} LedgerEvent
 */

/**
 * Reads the events of the ledger at a backend path.
 * @param {string} path
 * @param {string} backendToken
 * @returns {Promise<LedgerEvent[]>}
 */
const readEvents = async (path, backendToken) => {
  const { events } = /** @type {{ events: LedgerEvent[] }} */ (
    await fetchJsonFromBackend(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )

  return events
}

/**
 * Reads the accreditation's ledger by natural key.
 * @param {AccreditationKeys} keys
 * @param {string} backendToken
 * @returns {Promise<LedgerEvent[]>}
 */
export const fetchAccreditationLedgerEvents = async (keys, backendToken) =>
  readEvents(`${accreditationPath(keys)}/ledger`, backendToken)

/**
 * Reads the registered-only ledger events in a year by natural key.
 * @param {AccreditationKeys} keys
 * @param {string} backendToken
 * @returns {Promise<LedgerEvent[]>}
 */
export const fetchRegisteredOnlyLedgerEvents = async (
  { year, ...keys },
  backendToken
) =>
  readEvents(
    `${registrationPath(keys)}/ledger/${encodeURIComponent(year)}`,
    backendToken
  )
