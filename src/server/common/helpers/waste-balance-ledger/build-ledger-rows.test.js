import { describe, expect, it } from 'vitest'

/**
 * @import { Localise } from './build-ledger-rows.js'
 * @import { PrnEvent, SummaryLogEvent } from './fetch-ledger-events.js'
 */

import { buildLedgerRows } from './build-ledger-rows.js'

/**
 * Stands in for `request.t`. It returns the key and its interpolation so a
 * test asserts which copy was chosen without restating the copy itself.
 * @type {Localise}
 */
const localise = (key, values) =>
  values ? `${key}(${JSON.stringify(values)})` : key

/**
 * Issuing a note settles an amount the balance was already holding back, so it
 * takes the total down and leaves the available amount where it stood.
 * @param {Partial<PrnEvent>} [overrides]
 * @returns {PrnEvent}
 */
const buildEvent = (overrides = {}) => ({
  kind: 'prn-issued',
  createdAt: '2026-02-15T15:09:00.000Z',
  prn: { tonnage: 12.5 },
  balance: {
    opening: { total: 100, available: 87.5 },
    closing: { total: 87.5, available: 87.5 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  ...overrides
})

/**
 * Creating a note holds its tonnage back, so the available amount falls by it
 * while the total stands.
 * @param {Partial<PrnEvent>} [overrides]
 * @returns {PrnEvent}
 */
const buildNoteCreatedEvent = (overrides = {}) =>
  buildEvent({
    kind: 'prn-created',
    balance: {
      opening: { total: 100, available: 100 },
      closing: { total: 100, available: 87.5 }
    },
    ...overrides
  })

/**
 * A summary log states its credit where a note states its tonnage, so the
 * two subjects never appear on one event.
 * @param {Partial<SummaryLogEvent>} [overrides]
 * @returns {SummaryLogEvent}
 */
const buildSummaryLogEvent = (overrides = {}) => ({
  kind: 'summary-log-submitted',
  createdAt: '2026-01-04T09:00:00.000Z',
  summaryLog: { creditTotal: 40 },
  balance: {
    opening: { total: 60, available: 47.5 },
    closing: { total: 100, available: 87.5 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  ...overrides
})

/**
 * The cell text of one row. It throws rather than reading through an absent
 * row, so a test that expected a row and got none fails saying so.
 * @param {{ text: string }[] | undefined} row
 * @returns {string[]}
 */
const cellsOf = (row) => {
  if (!row) {
    throw new Error('expected a row')
  }

  return row.map(({ text }) => text)
}

describe(buildLedgerRows, () => {
  it('reverses the backend append order, so the newest event reads first', () => {
    const rows = buildLedgerRows({
      events: [
        buildEvent({ createdAt: '2026-01-01T00:00:00.000Z' }),
        buildEvent({ createdAt: '2026-03-01T00:00:00.000Z' })
      ],
      localise,
      noteType: 'PRN'
    })

    expect(rows.map((row) => cellsOf(row).at(0))).toStrictEqual([
      '1 March 2026, 12:00am',
      '1 January 2026, 12:00am'
    ])
  })

  it('renders the five columns in order', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent()],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row)).toStrictEqual([
      '15 February 2026, 3:09pm',
      'waste-balance-ledger:events.prn-issued({"noteType":"PRN"})',
      'waste-balance-ledger:table.noMovement',
      '87.50',
      'Ada Lovelace (ada@example.com)'
    ])
  })

  it('right-aligns the two number columns, and only those', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent()],
      localise,
      noteType: 'PRN'
    })

    expect(row?.map(({ format }) => format)).toStrictEqual([
      undefined,
      undefined,
      'numeric',
      'numeric',
      undefined
    ])
  })

  it('states what creating a note took out of the available balance', () => {
    const [row] = buildLedgerRows({
      events: [buildNoteCreatedEvent()],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(2)).toBe('-12.50')
  })

  it('states what a submitted summary log added to the available balance', () => {
    const [row] = buildLedgerRows({
      events: [buildSummaryLogEvent()],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(2)).toBe('+40.00')
  })

  it('says an event that moved the available balance by nothing moved nothing', () => {
    const [row] = buildLedgerRows({
      events: [
        buildEvent({
          kind: 'prn-accepted',
          balance: {
            opening: { total: 87.5, available: 87.5 },
            closing: { total: 87.5, available: 87.5 }
          }
        })
      ],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(2)).toBe('waste-balance-ledger:table.noMovement')
  })

  it('names the note type an exporter uses, so the event reads as a PERN', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent({ kind: 'prn-created' })],
      localise,
      noteType: 'PERN'
    })

    expect(cellsOf(row).at(1)).toBe(
      'waste-balance-ledger:events.prn-created({"noteType":"PERN"})'
    )
  })

  it.each([
    'prn-accepted',
    'prn-cancelled-after-issue',
    'prn-created',
    'prn-creation-cancelled',
    'prn-issued',
    'prn-rejected',
    'summary-log-submitted'
  ])('gives %s a plain-English name', (kind) => {
    const [row] = buildLedgerRows({
      events: [buildEvent({ kind })],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(1)).toBe(
      `waste-balance-ledger:events.${kind}({"noteType":"PRN"})`
    )
  })

  it('names an unknown kind verbatim rather than showing a missing copy key', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent({ kind: 'some-later-kind' })],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(1)).toBe('some-later-kind')
  })

  it('names the system where the backfill wrote the event', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent({ createdBy: { id: 'system', name: 'backfill' } })],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(4)).toBe('waste-balance-ledger:systemActor')
  })

  it('names an actor that carries no email by name alone', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent({ createdBy: { id: 'rpd', name: 'RPD' } })],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(4)).toBe('RPD')
  })

  it('names an actor that carries no name by their email alone', () => {
    const [row] = buildLedgerRows({
      events: [
        buildEvent({ createdBy: { id: 'user-2', email: 'ada@example.com' } })
      ],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(4)).toBe('ada@example.com')
  })

  it('leaves Who empty where the actor carries neither a name nor an email', () => {
    const [row] = buildLedgerRows({
      events: [buildEvent({ createdBy: { id: 'user-3' } })],
      localise,
      noteType: 'PRN'
    })

    expect(cellsOf(row).at(4)).toBe('')
  })

  it('returns no rows for a ledger that holds no events', () => {
    expect(
      buildLedgerRows({ events: [], localise, noteType: 'PRN' })
    ).toStrictEqual([])
  })
})
