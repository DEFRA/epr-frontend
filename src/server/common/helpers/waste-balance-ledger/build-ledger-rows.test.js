import { describe, expect, it } from 'vitest'

/**
 * @import { Localise, TableCell } from './build-ledger-rows.js'
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
 * Stands in for `request.localiseUrl`. It marks the path so a test asserts the
 * link was localised without restating how.
 * @param {string} path
 * @returns {string}
 */
const localiseUrl = (path) => `/en${path}`

/**
 * The ledger of one accreditation, which is the address that carries every id
 * a link to a note needs.
 * @param {Partial<Parameters<typeof buildLedgerRows>[0]>} [overrides]
 * @returns {TableCell[][]}
 */
const buildRows = (overrides = {}) =>
  buildLedgerRows({
    accreditationId: 'acc-1',
    events: [],
    localise,
    localiseUrl,
    noteType: 'PRN',
    organisationId: 'org-1',
    registrationId: 'reg-1',
    ...overrides
  })

/**
 * Issuing a note settles an amount the balance was already holding back, so it
 * takes the total down and leaves the available amount where it stood.
 *
 * The note carries no number, which is the state a note is in until it is
 * issued one. A test about a numbered note says so.
 * @param {Partial<PrnEvent>} [overrides]
 * @returns {PrnEvent}
 */
const buildEvent = (overrides = {}) => ({
  kind: 'prn-issued',
  createdAt: '2026-02-15T15:09:00.000Z',
  prn: { id: 'prn-1', prnNumber: null, tonnage: 12.5 },
  balance: {
    opening: { total: 100, available: 87.5 },
    closing: { total: 87.5, available: 87.5 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  ...overrides
})

/**
 * The same event, about a note that has been issued its number.
 * @param {string} [prnNumber]
 * @returns {PrnEvent}
 */
const buildNumberedEvent = (prnNumber = '240000123') =>
  buildEvent({ prn: { id: 'prn-1', prnNumber, tonnage: 12.5 } })

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
 * What each cell of one row holds, whether it holds it as text or as markup.
 * It throws rather than reading through an absent row, so a test that expected
 * a row and got none fails saying so.
 * @param {TableCell[] | undefined} row
 * @returns {string[]}
 */
const cellsOf = (row) => {
  if (!row) {
    throw new Error('expected a row')
  }

  return row.map((cell) => ('text' in cell ? cell.text : cell.html))
}

describe(buildLedgerRows, () => {
  it('reverses the backend append order, so the newest event reads first', () => {
    const rows = buildRows({
      events: [
        buildEvent({ createdAt: '2026-01-01T00:00:00.000Z' }),
        buildEvent({ createdAt: '2026-03-01T00:00:00.000Z' })
      ]
    })

    expect(rows.map((row) => cellsOf(row).at(0))).toStrictEqual([
      '1 March 2026, 12:00am',
      '1 January 2026, 12:00am'
    ])
  })

  it('renders the six columns in order', () => {
    const [row] = buildRows({ events: [buildEvent()] })

    expect(cellsOf(row)).toStrictEqual([
      '15 February 2026, 3:09pm',
      'waste-balance-ledger:events.prn-issued({"noteType":"PRN"})',
      'waste-balance-ledger:table.noMovement',
      '87.50',
      'Ada Lovelace (ada@example.com)',
      '<a href="/en/organisations/org-1/registrations/reg-1/accreditations/acc-1/packaging-recycling-notes/prn-1/view" class="govuk-link">waste-balance-ledger:viewPrn <span class="govuk-visually-hidden">15 February 2026, 3:09pm</span></a>'
    ])
  })

  it('right-aligns the two number columns, and only those', () => {
    const [row] = buildRows({ events: [buildEvent()] })

    expect(
      row?.map((cell) => ('format' in cell ? cell.format : undefined))
    ).toStrictEqual([
      undefined,
      undefined,
      'numeric',
      'numeric',
      undefined,
      undefined
    ])
  })

  it('states what creating a note took out of the available balance', () => {
    const [row] = buildRows({ events: [buildNoteCreatedEvent()] })

    expect(cellsOf(row).at(2)).toBe('-12.50')
  })

  it('states what a submitted summary log added to the available balance', () => {
    const [row] = buildRows({ events: [buildSummaryLogEvent()] })

    expect(cellsOf(row).at(2)).toBe('+40.00')
  })

  it('says an event that moved the available balance by nothing moved nothing', () => {
    const [row] = buildRows({
      events: [
        buildEvent({
          kind: 'prn-accepted',
          balance: {
            opening: { total: 87.5, available: 87.5 },
            closing: { total: 87.5, available: 87.5 }
          }
        })
      ]
    })

    expect(cellsOf(row).at(2)).toBe('waste-balance-ledger:table.noMovement')
  })

  it('names the note type an exporter uses, so the event reads as a PERN', () => {
    const [row] = buildRows({
      events: [buildEvent({ kind: 'prn-created' })],
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
    const [row] = buildRows({ events: [buildEvent({ kind })] })

    expect(cellsOf(row).at(1)).toBe(
      `waste-balance-ledger:events.${kind}({"noteType":"PRN"})`
    )
  })

  it('names an unknown kind verbatim rather than showing a missing copy key', () => {
    const [row] = buildRows({
      events: [buildEvent({ kind: 'some-later-kind' })]
    })

    expect(cellsOf(row).at(1)).toBe('some-later-kind')
  })

  it('reads the number of the note under the event it happened to', () => {
    const [row] = buildRows({ events: [buildNumberedEvent()] })

    expect(cellsOf(row).at(1)).toBe(
      'waste-balance-ledger:events.prn-issued({&quot;noteType&quot;:&quot;PRN&quot;})<br>\n240000123'
    )
  })

  it('escapes a note number rather than letting it carry markup into the cell', () => {
    const [row] = buildRows({
      events: [buildNumberedEvent('<script>x</script>')]
    })

    expect(cellsOf(row).at(1)).toContain('&lt;script&gt;x&lt;/script&gt;')
  })

  it('names the event alone where the note has not been given a number', () => {
    const [row] = buildRows({ events: [buildEvent()] })

    expect(cellsOf(row).at(1)).toBe(
      'waste-balance-ledger:events.prn-issued({"noteType":"PRN"})'
    )
  })

  it('offers a way into the note the event happened to', () => {
    const [row] = buildRows({ events: [buildNumberedEvent()] })

    expect(cellsOf(row).at(5)).toBe(
      '<a href="/en/organisations/org-1/registrations/reg-1/accreditations/acc-1/packaging-recycling-notes/prn-1/view" class="govuk-link">waste-balance-ledger:viewPrn <span class="govuk-visually-hidden">240000123</span></a>'
    )
  })

  it('names an unnumbered note by when the event happened, so the links stay apart', () => {
    const [row] = buildRows({ events: [buildEvent()] })

    expect(cellsOf(row).at(5)).toContain(
      '<span class="govuk-visually-hidden">15 February 2026, 3:09pm</span>'
    )
  })

  it('offers nothing to open on a summary log, which is not a note', () => {
    const [row] = buildRows({ events: [buildSummaryLogEvent()] })

    expect(cellsOf(row).at(5)).toBe('')
  })

  it('offers nothing to open on a ledger read without an accreditation', () => {
    const [row] = buildRows({
      accreditationId: undefined,
      events: [buildNumberedEvent()]
    })

    expect(cellsOf(row).at(5)).toBe('')
  })

  it('names the system where the backfill wrote the event', () => {
    const [row] = buildRows({
      events: [buildEvent({ createdBy: { id: 'system', name: 'backfill' } })]
    })

    expect(cellsOf(row).at(4)).toBe('waste-balance-ledger:systemActor')
  })

  it('names an actor that carries no email by name alone', () => {
    const [row] = buildRows({
      events: [buildEvent({ createdBy: { id: 'rpd', name: 'RPD' } })]
    })

    expect(cellsOf(row).at(4)).toBe('RPD')
  })

  it('names an actor that carries no name by their email alone', () => {
    const [row] = buildRows({
      events: [
        buildEvent({ createdBy: { id: 'user-2', email: 'ada@example.com' } })
      ]
    })

    expect(cellsOf(row).at(4)).toBe('ada@example.com')
  })

  it('leaves Who empty where the actor carries neither a name nor an email', () => {
    const [row] = buildRows({
      events: [buildEvent({ createdBy: { id: 'user-3' } })]
    })

    expect(cellsOf(row).at(4)).toBe('')
  })

  it('returns no rows for a ledger that holds no events', () => {
    expect(buildRows({ events: [] })).toStrictEqual([])
  })
})
