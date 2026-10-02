import { describe, expect, it } from 'vitest'

import { formatLedgerTimestamp } from './format-ledger-timestamp.js'

describe(formatLedgerTimestamp, () => {
  it('reads the date and the time of day together', () => {
    expect(formatLedgerTimestamp('2026-02-15T15:09:00.000Z')).toBe(
      '15 February 2026, 3:09pm'
    )
  })

  it('tells the two events of one day apart', () => {
    expect(formatLedgerTimestamp('2026-08-16T08:00:00.000Z')).toBe(
      '16 August 2026, 9:00am'
    )
    expect(formatLedgerTimestamp('2026-08-16T18:45:00.000Z')).toBe(
      '16 August 2026, 7:45pm'
    )
  })

  it('reads a summer timestamp in British Summer Time', () => {
    expect(formatLedgerTimestamp('2026-08-18T16:06:00.000Z')).toBe(
      '18 August 2026, 5:06pm'
    )
  })

  it('dates a late-evening summer event by the day it happened here', () => {
    expect(formatLedgerTimestamp('2026-08-18T23:30:00.000Z')).toBe(
      '19 August 2026, 12:30am'
    )
  })

  it('says nothing about a timestamp it cannot read', () => {
    expect(formatLedgerTimestamp('not a date')).toBe('')
  })

  it('says nothing about a timestamp that is not there', () => {
    expect(formatLedgerTimestamp(undefined)).toBe('')
  })
})
