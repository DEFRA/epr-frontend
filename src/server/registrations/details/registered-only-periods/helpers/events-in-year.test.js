import { describe, expect, it } from 'vitest'

/**
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 */

import { eventsInYear } from './events-in-year.js'

/**
 * A registered-only submission, which the backend writes zero-delta.
 * @param {string} createdAt
 * @returns {LedgerEvent}
 */
const buildEvent = (createdAt) => ({
  kind: 'summary-log-submitted',
  createdAt,
  summaryLog: { creditTotal: 0 },
  balance: {
    opening: { total: 0, available: 0 },
    closing: { total: 0, available: 0 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
})

/**
 * @param {LedgerEvent[]} events
 * @returns {string[]}
 */
const timestampsOf = (events) => events.map((event) => event.createdAt)

describe(eventsInYear, () => {
  it('keeps the events the year holds, in the order they arrived', () => {
    const events = [
      buildEvent('2026-03-01T09:00:00.000Z'),
      buildEvent('2026-07-14T17:06:00.000Z')
    ]

    expect(timestampsOf(eventsInYear({ events, year: 2026 }))).toStrictEqual([
      '2026-03-01T09:00:00.000Z',
      '2026-07-14T17:06:00.000Z'
    ])
  })

  it('drops the events of every other year', () => {
    const events = [
      buildEvent('2025-12-31T23:59:59.999Z'),
      buildEvent('2026-06-01T12:00:00.000Z'),
      buildEvent('2027-01-01T00:00:00.000Z')
    ]

    expect(timestampsOf(eventsInYear({ events, year: 2026 }))).toStrictEqual([
      '2026-06-01T12:00:00.000Z'
    ])
  })

  it('counts the first instant of the year as inside it', () => {
    const events = [buildEvent('2026-01-01T00:00:00.000Z')]

    expect(eventsInYear({ events, year: 2026 })).toHaveLength(1)
  })

  it('counts the last instant of the year as inside it', () => {
    const events = [buildEvent('2026-12-31T23:59:59.999Z')]

    expect(eventsInYear({ events, year: 2026 })).toHaveLength(1)
  })

  it('reads the year in UTC, so a late December evening stays in its own year', () => {
    const events = [buildEvent('2026-12-31T23:00:00.000Z')]

    expect(eventsInYear({ events, year: 2027 })).toStrictEqual([])
  })

  it('answers nothing for a ledger that holds no events', () => {
    expect(eventsInYear({ events: [], year: 2026 })).toStrictEqual([])
  })

  it('leaves the events it was given alone', () => {
    const events = [buildEvent('2025-06-01T12:00:00.000Z')]

    eventsInYear({ events, year: 2026 })

    expect(events).toHaveLength(1)
  })
})
