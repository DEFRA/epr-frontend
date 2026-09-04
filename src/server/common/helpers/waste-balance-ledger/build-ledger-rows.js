import {
  formatSignedTonnage,
  formatTonnage
} from '#config/nunjucks/filters/format-tonnage.js'
import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { buildActionLinkHtml } from '#server/reports/helpers/build-action-link-html.js'

import { LEDGER_EVENT_KIND, SYSTEM_ACTOR_ID } from './ledger-event-kinds.js'
import { formatLedgerTimestamp } from './format-ledger-timestamp.js'

/**
 * @import { LedgerEvent } from './fetch-ledger-events.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 */

/**
 * @typedef {{ text: string, format?: string } | { html: string }} TableCell
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
 * What the event concerns: its name, and beneath it the number of the note it
 * concerns where that note has one.
 *
 * The cell carries markup only where there is a second line to carry. An event
 * that names no numbered note stays a text cell, escaped by the table macro
 * rather than here.
 * @param {{
 *   event: LedgerEvent,
 *   localise: Localise,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 * @returns {TableCell}
 */
const eventCell = ({ event, localise, noteType }) => {
  const name = eventName({ kind: event.kind, localise, noteType })
  const prnNumber = event.prn?.prnNumber

  if (!prnNumber) {
    return { text: name }
  }

  return { html: `${escapeHtml(name)}<br>\n${escapeHtml(prnNumber)}` }
}

/**
 * Where one note lives. Every segment is an id read off an address or off the
 * backend, and the path it builds goes straight into an href, so each is
 * encoded rather than trusted to be URL-safe.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   prnId: string
 * }} ids
 * @returns {string}
 */
const notePath = ({ organisationId, registrationId, accreditationId, prnId }) =>
  [
    'organisations',
    organisationId,
    'registrations',
    registrationId,
    'accreditations',
    accreditationId,
    'packaging-recycling-notes',
    prnId,
    'view'
  ]
    .map((segment) => `/${encodeURIComponent(segment)}`)
    .join('')

/**
 * The action the row offers. Only an event that concerns a note has a note to
 * open, and only a ledger addressed by an accreditation carries the id that
 * note lives under, so every other row's cell is empty rather than linking at
 * nothing.
 *
 * The link names the note it opens, so a ledger of otherwise identical links
 * stays distinguishable. A note that has no number yet is named by when the
 * event happened, which is the only other thing on the row that tells it apart.
 * @param {{
 *   accreditationId: string | undefined,
 *   event: LedgerEvent,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationId: string,
 *   registrationId: string
 * }} params
 * @returns {TableCell}
 */
const actionCell = ({
  accreditationId,
  event,
  localise,
  localiseUrl,
  organisationId,
  registrationId
}) => {
  if (!event.prn || !accreditationId) {
    return { text: '' }
  }

  const url = localiseUrl(
    notePath({
      organisationId,
      registrationId,
      accreditationId,
      prnId: event.prn.id
    })
  )

  return {
    html: buildActionLinkHtml(
      localise('waste-balance-ledger:viewPrn'),
      url,
      event.prn.prnNumber ?? formatLedgerTimestamp(event.createdAt)
    )
  }
}

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
 *
 * The address the ledger was read from is passed in whole, because a row links
 * out to the note behind it and a note lives under an accreditation. The
 * registered-only partition is addressed without one, so it has nothing to
 * link at.
 * @param {{
 *   accreditationId: string | undefined,
 *   events: LedgerEvent[],
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   noteType: 'PRN' | 'PERN',
 *   organisationId: string,
 *   registrationId: string
 * }} params
 * @returns {TableCell[][]}
 */
export const buildLedgerRows = ({
  accreditationId,
  events,
  localise,
  localiseUrl,
  noteType,
  organisationId,
  registrationId
}) =>
  [...events].reverse().map((event) => [
    { text: formatLedgerTimestamp(event.createdAt) },
    eventCell({ event, localise, noteType }),
    {
      text: movementOf({ balance: event.balance, localise }),
      format: 'numeric'
    },
    {
      text: formatTonnage(event.balance.closing.available),
      format: 'numeric'
    },
    { text: actorName({ createdBy: event.createdBy, localise }) },
    actionCell({
      accreditationId,
      event,
      localise,
      localiseUrl,
      organisationId,
      registrationId
    })
  ])
