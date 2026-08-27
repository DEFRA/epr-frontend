import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { escapeHtml } from '#server/common/helpers/escape-html.js'

import { LEDGER_EVENT_KIND, SYSTEM_ACTOR_ID } from '../ledger-event-kinds.js'
import { formatLedgerTimestamp } from './format-ledger-timestamp.js'

/**
 * @import { TFunction } from 'i18next'
 */

/** @type {readonly string[]} */
const EVENT_KINDS = Object.freeze(Object.values(LEDGER_EVENT_KIND))

/**
 * The name the page gives an event. A kind the backend adds later has no copy
 * here, so it reads as itself rather than as a missing copy key.
 * @param {{ kind: string, localise: TFunction, noteType: 'PRN' | 'PERN' }} params
 * @returns {string}
 */
export const eventName = ({ kind, localise, noteType }) =>
  EVENT_KINDS.includes(kind)
    ? localise(`waste-balance-ledger:events.${kind}`, { noteType })
    : kind

/**
 * A regulator sees every actor in full. The backfill writes as a machine, so
 * the page names the system rather than the job that ran.
 *
 * Only the id is certain, so each of the name and the email can be the whole
 * answer. An actor carrying neither is named as unrecorded rather than left
 * blank: an empty cell reads as an oversight, and the absence is a fact.
 * @param {{ createdBy: { id: string, name?: string, email?: string }, localise: TFunction }} params
 * @returns {string}
 */
export const actorName = ({ createdBy, localise }) => {
  if (createdBy.id === SYSTEM_ACTOR_ID) {
    return localise('waste-balance-ledger:systemActor')
  }

  const { email, name } = createdBy

  return name ?? email ?? localise('waste-balance-ledger:unknownActor')
}

/**
 * The tonnage the event's own subject states. A summary log states a credit
 * for the whole period; a note states its own amount. The two are different
 * quantities, and neither is the amount a balance moved.
 * @param {{ summaryLog?: { creditTotal: number }, prn?: { tonnage: number } }} event
 * @returns {number}
 */
export const recordTonnage = (event) =>
  event.summaryLog ? event.summaryLog.creditTotal : event.prn.tonnage

/**
 * A signed tonnage, so a reader can tell a credit from a debit without
 * comparing it with the row below. Zero carries no sign: nothing moved.
 * @param {number} value
 * @returns {string}
 */
export const formatChange = (value) => {
  if (value === 0) {
    return formatTonnage(0)
  }

  return value > 0
    ? `+${formatTonnage(value)}`
    : `−${formatTonnage(Math.abs(value))}`
}

/**
 * What an event did to the available balance, and to the total.
 * @param {{ balance: { opening: { total: number, available: number }, closing: { total: number, available: number } } }} event
 */
export const changesOf = (event) => ({
  available: event.balance.closing.available - event.balance.opening.available,
  total: event.balance.closing.total - event.balance.opening.total
})

/**
 * The record an event concerns, as a link a regulator can follow.
 *
 * A summary log carries no number a person could quote, so the link says what
 * following it does. A note carries one only once it has been issued, so a
 * note cancelled before issue is named by the link alone. Either way the link
 * text alone would repeat down the column, so each carries the event's own
 * date for a screen reader.
 * @param {{
 *   event: object,
 *   ledgerPath: string,
 *   localise: TFunction,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 * @returns {string}
 */
export const relatedRecordHtml = ({
  event,
  ledgerPath,
  localise,
  noteType
}) => {
  const context = `<span class="govuk-visually-hidden"> ${escapeHtml(formatLedgerTimestamp(event.createdAt))}</span>`

  if (event.summaryLog) {
    const href = `${ledgerPath}/summary-logs/${encodeURIComponent(event.summaryLog.id)}/file`
    const download = escapeHtml(
      localise('waste-balance-ledger:downloadSummaryLog')
    )

    return `<a class="govuk-link" href="${escapeHtml(href)}">${download}${context}</a>`
  }

  const href = `${ledgerPath}/packaging-recycling-notes/${encodeURIComponent(event.prn.id)}/view`
  const text = event.prn.prnNumber
    ? `${noteType} ${event.prn.prnNumber}`
    : localise('waste-balance-ledger:viewNote', { noteType })

  return `<a class="govuk-link" href="${escapeHtml(href)}">${escapeHtml(text)}${context}</a>`
}
