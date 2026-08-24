import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

import { LEDGER_EVENT_KIND, SYSTEM_ACTOR_ID } from '../ledger-event-kinds.js'
import { formatLedgerTimestamp } from './format-ledger-timestamp.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { LedgerEvent } from './fetch-ledger-events.js'
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
 * @param {{ kind: string, localise: TFunction, noteType: 'PRN' | 'PERN' }} params
 * @returns {string}
 */
const eventName = ({ kind, localise, noteType }) =>
  EVENT_KINDS.includes(kind)
    ? localise(`waste-balance-ledger:events.${kind}`, { noteType })
    : kind

/**
 * A summary log raises a credit against the whole period, and a note moves a
 * single amount, so the two state their tonnage on different subjects. An
 * event carries one subject or the other, never both.
 * @param {LedgerEvent} event
 * @returns {number}
 */
const tonnageOf = (event) =>
  event.summaryLog ? event.summaryLog.creditTotal : event.prn.tonnage

/**
 * A regulator sees every actor in full. The backfill writes as a machine, so
 * the page names the system rather than the job that ran.
 *
 * Only the id is certain, so each of the name and the email can be the whole
 * answer. An actor that carries neither reads as an empty cell, which says
 * less than the page would like but never says something untrue.
 * @param {{ createdBy: LedgerEvent['createdBy'], localise: TFunction }} params
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
 * There is no single "change" column, because the effects differ per event: a
 * note moves the available amount when it is created and the total when it is
 * issued, and moves neither when it is accepted or rejected. The two running
 * totals beside the event name carry that honestly.
 * @param {{
 *   events: LedgerEvent[],
 *   localise: TFunction,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 * @returns {{ text: string }[][]}
 */
export const buildLedgerRows = ({ events, localise, noteType }) =>
  [...events]
    .reverse()
    .map((event) => [
      { text: formatLedgerTimestamp(event.createdAt) },
      { text: eventName({ kind: event.kind, localise, noteType }) },
      { text: formatTonnage(tonnageOf(event)) },
      { text: formatTonnage(event.balance.closing.total) },
      { text: formatTonnage(event.balance.closing.available) },
      { text: actorName({ createdBy: event.createdBy, localise }) }
    ])
