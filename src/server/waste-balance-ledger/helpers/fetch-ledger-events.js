import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * What every entry of a waste balance ledger states, whichever thing it
 * concerns.
 *
 * `balance` carries the running totals either side of the event. Only the
 * closing pair is declared, because the page shows the state each event left
 * behind rather than the state it found.
 *
 * An actor carries an id and nothing else for certain. A machine writer has no
 * email, and a record written before a name was captured has no name, so the
 * page must read an actor that holds only one of the two.
 * @typedef {{
 *   kind: string,
 *   createdAt: string,
 *   createdBy: { id: string, name?: string, email?: string },
 *   balance: { closing: { total: number, available: number } }
 * }} LedgerEventCommon
 */

/**
 * An entry that credits a submitted waste report. `creditTotal` is the total
 * the report itself states, not the amount the balance moved.
 * @typedef {LedgerEventCommon & {
 *   summaryLog: { creditTotal: number },
 *   prn?: never
 * }} SummaryLogEvent
 */

/**
 * An entry that concerns a single note. `tonnage` is the tonnage of the note
 * itself, not the amount the balance moved: accepting or rejecting a note
 * moves neither total.
 * @typedef {LedgerEventCommon & {
 *   prn: { tonnage: number },
 *   summaryLog?: never
 * }} PrnEvent
 */

/**
 * @typedef {SummaryLogEvent | PrnEvent} LedgerEvent
 */

/**
 * Reads the events of one waste balance ledger, in the order the backend
 * appended them.
 *
 * A ledger is partitioned by accreditation, the registered-only phase
 * included, and each partition has its own address. The accreditation is
 * therefore taken from the address rather than derived from the registration:
 * the id is constitutive of the ledger, so deriving it would make the same
 * address name a different ledger once the accreditation changes.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string | undefined,
 *   backendToken: string
 * }} params
 * @returns {Promise<LedgerEvent[]>}
 */
export const fetchLedgerEvents = async ({
  organisationId,
  registrationId,
  accreditationId,
  backendToken
}) => {
  const registrationPath = `/v1/organisations/${organisationId}/registrations/${registrationId}`
  const ledgerPath = accreditationId
    ? `${registrationPath}/accreditations/${accreditationId}/waste-balance-ledger`
    : `${registrationPath}/waste-balance-ledger`

  const { events } = /** @type {{ events: LedgerEvent[] }} */ (
    await fetchJsonFromBackend(ledgerPath, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )

  return events
}
