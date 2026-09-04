import {
  formatSignedTonnage,
  formatTonnage
} from '#config/nunjucks/filters/format-tonnage.js'

import { LEDGER_EVENT_KIND, SYSTEM_ACTOR_ID } from './ledger-event-kinds.js'
import { formatLedgerTimestamp } from './format-ledger-timestamp.js'

/**
 * @import { LedgerEvent } from './fetch-ledger-events.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 */

/**
 * The kinds the page has copy for. It is a list of strings to test a wire
 * value against, so it is typed as such rather than as the literal union: a
 * kind the backend adds later is a `string` this list simply does not hold.
 * @type {readonly string[]}
 */
const EVENT_KINDS = Object.freeze(Object.values(LEDGER_EVENT_KIND))

/**
 * The name the page gives an event. A kind the backend adds later has no copy
 * here, so it reads as itself rather than as a missing copy key.
 * @param {{ kind: string, localise: Localise, noteType: 'PRN' | 'PERN' }} params
 * @returns {string}
 */
const eventName = ({ kind, localise, noteType }) =>
  EVENT_KINDS.includes(kind)
    ? localise(`waste-balance-ledger:events.${kind}`, { noteType })
    : kind

/**
 * What the event moved the available balance by, signed, and the copy for
 * nothing where it moved it by nothing: issuing a note settles an amount that
 * was already held back, and accepting or rejecting one settles nothing at all.
 * @param {{ balance: LedgerEvent['balance'], localise: Localise }} params
 * @returns {string}
 */
const movementOf = ({ balance, localise }) => {
  const movement = balance.closing.available - balance.opening.available

  return movement === 0
    ? localise('waste-balance-ledger:table.noMovement')
    : formatSignedTonnage(movement)
}

/**
 * A regulator sees every actor in full. The backfill writes as a machine, so
 * the page names the system rather than the job that ran.
 *
 * Only the id is certain, so each of the name and the email can be the whole
 * answer. An actor that carries neither reads as an empty cell, which says
 * less than the page would like but never says something untrue.
 * @param {{ createdBy: LedgerEvent['createdBy'], localise: Localise }} params
 * @returns {string}
 */
const actorName = ({ createdBy, localise }) => {
  if (createdBy.id === SYSTEM_ACTOR_ID) {
    return localise('waste-balance-ledger:systemActor')
  }

  const { email, name } = createdBy

  if (name && email) {
    return `${name} (${email})`
  }

  return name ?? email ?? ''
}

/**
 * Builds the table rows of the waste balance ledger, newest event first.
 *
 * The ledger reads as a running account of the available balance: what each
 * event moved, and what it left. The total behind the available amount moves
 * on its own schedule and is not part of that account.
 * @param {{
 *   events: LedgerEvent[],
 *   localise: Localise,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 * @returns {{ text: string, format?: string }[][]}
 */
export const buildLedgerRows = ({ events, localise, noteType }) =>
  [...events].reverse().map((event) => [
    { text: formatLedgerTimestamp(event.createdAt) },
    { text: eventName({ kind: event.kind, localise, noteType }) },
    {
      text: movementOf({ balance: event.balance, localise }),
      format: 'numeric'
    },
    {
      text: formatTonnage(event.balance.closing.available),
      format: 'numeric'
    },
    { text: actorName({ createdBy: event.createdBy, localise }) }
  ])
