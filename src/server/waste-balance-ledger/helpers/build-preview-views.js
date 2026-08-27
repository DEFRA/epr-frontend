import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { escapeHtml } from '#server/common/helpers/escape-html.js'

import { formatLedgerTimestamp } from './format-ledger-timestamp.js'
import {
  actorName,
  changesOf,
  eventName,
  formatChange,
  recordTonnage,
  relatedRecordHtml
} from './ledger-view.js'

/**
 * @import { TFunction } from 'i18next'
 */

const numeric = 'govuk-table__cell--numeric'

/**
 * The address of one event's own page. The number is the event's identity, and
 * coercing it here keeps a value that is not one out of the address.
 * @param {{ event: object, ledgerPath: string }} params
 * @returns {string}
 */
const eventHref = ({ event, ledgerPath }) =>
  `${ledgerPath}/waste-balance-ledger/events/${Number(event.number)}`

/**
 * The event's name, as a link to the event's own page.
 * @param {{
 *   event: object,
 *   ledgerPath: string,
 *   localise: TFunction,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 * @returns {string}
 */
const eventLinkHtml = ({ event, ledgerPath, localise, noteType }) =>
  `<a class="govuk-link" href="${eventHref({ event, ledgerPath })}">${escapeHtml(eventName({ kind: event.kind, localise, noteType }))}</a>`

/**
 * The overview a regulator reads day to day: what moved the available
 * balance, and what it stands at now.
 *
 * An event that left the available balance where it found it is not here. The
 * test is the movement itself rather than the kind of event, because a
 * resubmission restating a total it has already credited moves nothing, and a
 * kind this list did not anticipate still states what it did.
 * @param {{
 *   events: object[],
 *   ledgerPath: string,
 *   localise: TFunction,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 */
export const buildOverviewRows = ({ events, ledgerPath, localise, noteType }) =>
  [...events]
    .filter(
      (event) =>
        event.balance.closing.available !== event.balance.opening.available
    )
    .reverse()
    .map((event) => [
      { text: formatLedgerTimestamp(event.createdAt) },
      { html: eventLinkHtml({ event, ledgerPath, localise, noteType }) },
      { html: relatedRecordHtml({ event, ledgerPath, localise, noteType }) },
      { text: formatChange(changesOf(event).available), classes: numeric },
      { text: formatTonnage(event.balance.closing.available), classes: numeric }
    ])

/**
 * Every event the ledger holds, with both running totals and what each event
 * did to them.
 *
 * The event number is the integrity check: it counts from one without a gap,
 * so a number missing from this column is an event missing from the ledger.
 * @param {{
 *   events: object[],
 *   ledgerPath: string,
 *   localise: TFunction,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 */
export const buildDetailRows = ({ events, ledgerPath, localise, noteType }) =>
  [...events].reverse().map((event) => {
    const change = changesOf(event)

    return [
      {
        html: `<a class="govuk-link" href="${eventHref({ event, ledgerPath })}">${Number(event.number)}</a>`
      },
      { text: eventName({ kind: event.kind, localise, noteType }) },
      { html: relatedRecordHtml({ event, ledgerPath, localise, noteType }) },
      { text: formatTonnage(recordTonnage(event)), classes: numeric },
      { text: formatChange(change.available), classes: numeric },
      {
        text: formatTonnage(event.balance.closing.available),
        classes: numeric
      },
      { text: formatChange(change.total), classes: numeric },
      { text: formatTonnage(event.balance.closing.total), classes: numeric },
      { text: formatLedgerTimestamp(event.createdAt) },
      { text: actorName({ createdBy: event.createdBy, localise }) }
    ]
  })

/**
 * One event, stated in full.
 *
 * A page per event carries what no column could: the ids a reader needs to
 * follow the record into another system, and the balances the event opened
 * on. An opening balance that does not match the closing balance of the event
 * before it is how a missing event shows itself.
 * @param {{
 *   event: object,
 *   ledgerPath: string,
 *   localise: TFunction,
 *   noteType: 'PRN' | 'PERN'
 * }} params
 */
export const buildEventView = ({ event, ledgerPath, localise, noteType }) => {
  const change = changesOf(event)

  /**
   * A stated value. The summary list escapes `text`, so anything the backend
   * supplies goes through here rather than through `html`.
   * @param {string} key
   * @param {string} value
   */
  const row = (key, value) => ({
    key: { text: key },
    value: { text: value }
  })

  /**
   * A value that is markup this page built: a link, or an id set in code. Its
   * own interpolations are escaped where they are built.
   * @param {string} key
   * @param {string} value
   */
  const markupRow = (key, value) => ({
    key: { text: key },
    value: { html: value }
  })

  const subjectRows = event.summaryLog
    ? [
        markupRow(
          localise('waste-balance-ledger:event.summaryLogId'),
          `<code>${escapeHtml(event.summaryLog.id)}</code>`
        ),
        markupRow(
          localise('waste-balance-ledger:event.summaryLog'),
          relatedRecordHtml({ event, ledgerPath, localise, noteType })
        ),
        row(
          localise('waste-balance-ledger:event.creditTotal'),
          formatTonnage(event.summaryLog.creditTotal)
        )
      ]
    : [
        markupRow(
          localise('waste-balance-ledger:event.noteId', { noteType }),
          `<code>${escapeHtml(event.prn.id)}</code>`
        ),
        event.prn.prnNumber
          ? markupRow(
              localise('waste-balance-ledger:event.noteNumber', { noteType }),
              relatedRecordHtml({ event, ledgerPath, localise, noteType })
            )
          : row(
              localise('waste-balance-ledger:event.noteNumber', { noteType }),
              localise('waste-balance-ledger:event.notIssued')
            ),
        row(
          localise('waste-balance-ledger:event.noteTonnage', { noteType }),
          formatTonnage(event.prn.tonnage)
        )
      ]

  return {
    title: eventName({ kind: event.kind, localise, noteType }),
    rows: [
      row(localise('waste-balance-ledger:event.number'), String(event.number)),
      markupRow(
        localise('waste-balance-ledger:event.kind'),
        `<code>${escapeHtml(event.kind)}</code>`
      ),
      row(
        localise('waste-balance-ledger:event.recordedAt'),
        formatLedgerTimestamp(event.createdAt)
      ),
      row(
        localise('waste-balance-ledger:event.recordedBy'),
        actorName({ createdBy: event.createdBy, localise })
      ),
      row(
        localise('waste-balance-ledger:event.email'),
        event.createdBy.email ?? localise('waste-balance-ledger:event.none')
      ),
      markupRow(
        localise('waste-balance-ledger:event.actorId'),
        `<code>${escapeHtml(event.createdBy.id)}</code>`
      ),
      ...subjectRows,
      row(
        localise('waste-balance-ledger:event.availableBefore'),
        formatTonnage(event.balance.opening.available)
      ),
      row(
        localise('waste-balance-ledger:event.availableAfter'),
        formatTonnage(event.balance.closing.available)
      ),
      row(
        localise('waste-balance-ledger:event.availableChange'),
        formatChange(change.available)
      ),
      row(
        localise('waste-balance-ledger:event.balanceBefore'),
        formatTonnage(event.balance.opening.total)
      ),
      row(
        localise('waste-balance-ledger:event.balanceAfter'),
        formatTonnage(event.balance.closing.total)
      ),
      row(
        localise('waste-balance-ledger:event.balanceChange'),
        formatChange(change.total)
      )
    ]
  }
}
