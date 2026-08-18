import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'

import { LEDGER_EVENT_KIND, SYSTEM_ACTOR_ID } from '../ledger-event-kinds.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { LedgerEvent } from './fetch-waste-balance-events.js'
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
    ? localise(`waste-balance-history:events.${kind}`, { noteType })
    : kind

/**
 * A waste report raises a credit against the whole period, and a note moves a
 * single amount, so the two carry their tonnage on different fields.
 * @param {LedgerEvent} event
 * @returns {number | undefined}
 */
const tonnageOf = (event) =>
  event.kind === LEDGER_EVENT_KIND.summaryLogSubmitted
    ? event.payload.creditTotal
    : event.payload.amount

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
  if (!createdBy) {
    return ''
  }

  if (createdBy.id === SYSTEM_ACTOR_ID) {
    return localise('waste-balance-history:systemActor')
  }

  const { email, name } = createdBy

  if (name && email) {
    return `${name} (${email})`
  }

  return name ?? email ?? ''
}

/**
 * Builds the table rows of the waste balance history, newest event first.
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
export const buildHistoryRows = ({ events, localise, noteType }) =>
  [...events]
    .reverse()
    .map((event) => [
      { text: formatDate(event.createdAt) },
      { text: eventName({ kind: event.kind, localise, noteType }) },
      { text: formatTonnage(tonnageOf(event)) },
      { text: formatTonnage(event.closingBalance.amount) },
      { text: formatTonnage(event.closingBalance.availableAmount) },
      { text: actorName({ createdBy: event.createdBy, localise }) }
    ])
