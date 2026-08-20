import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * One entry of a waste balance ledger, as the backend holds it.
 *
 * `payload` carries the tonnage the event moved, on a field that differs by
 * kind. `closingBalance` carries the two running totals after the event.
 *
 * An actor carries an id and nothing else for certain. A machine writer has no
 * email, and a record written before a name was captured has no name, so the
 * page must read an actor that holds only one of the two.
 * @typedef {{
 *   kind: string,
 *   createdAt: string,
 *   payload: { amount?: number, creditTotal?: number },
 *   closingBalance: { amount: number, availableAmount: number },
 *   createdBy?: { id: string, name?: string, email?: string }
 * }} LedgerEvent
 */

/**
 * Reads one waste balance ledger in the order the backend appended it.
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
export const fetchWasteBalanceEvents = async ({
  organisationId,
  registrationId,
  accreditationId,
  backendToken
}) => {
  const registrationPath = `/v1/admin/organisations/${organisationId}/registrations/${registrationId}`
  const ledgerPath = accreditationId
    ? `${registrationPath}/accreditations/${accreditationId}/waste-balance-events`
    : `${registrationPath}/waste-balance-events`

  return /** @type {Promise<LedgerEvent[]>} */ (
    fetchJsonFromBackend(ledgerPath, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )
}
