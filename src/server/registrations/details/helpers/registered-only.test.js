import { calendarDate } from '#server/common/helpers/calendar-date.js'
import { describe, expect, it } from 'vitest'

import {
  registeredOnlyStretches,
  registrationYears
} from './registered-only.js'

/**
 * @import { Stretch } from './registered-only.js'
 */

// Every test pins the clock. The helpers run to "today", so a test reading the
// real one would start failing on 1 January.
const now = new Date('2026-06-15T00:00:00Z')

describe(registrationYears, () => {
  it('names no year for a registration that was never approved', () => {
    expect(
      registrationYears({
        dateRange: { validFrom: null },
        now
      })
    ).toStrictEqual([])
  })

  it('runs from the year it started to the current year, most recent first', () => {
    expect(
      registrationYears({
        dateRange: { validFrom: '2024-06-01' },
        now
      })
    ).toStrictEqual([2026, 2025, 2024])
  })

  it('names one year for a registration that started this year', () => {
    expect(
      registrationYears({
        dateRange: { validFrom: '2026-02-01' },
        now
      })
    ).toStrictEqual([2026])
  })

  // A registration can be granted before the year it covers begins, so its
  // start date may still be in the future.
  it('names no year for a registration that has not started yet', () => {
    expect(
      registrationYears({
        dateRange: { validFrom: '2027-01-01' },
        now
      })
    ).toStrictEqual([])
  })

  it('reads the starting year as UTC', () => {
    expect(
      registrationYears({
        dateRange: { validFrom: '2026-01-01T00:00:00Z' },
        now
      })
    ).toStrictEqual([2026])
  })
})

describe(registeredOnlyStretches, () => {
  /**
   * @param {string} from
   * @param {string} to
   * @returns {Stretch}
   */
  const accreditedOver = (from, to) => ({
    from: calendarDate(from),
    to: calendarDate(to)
  })

  /**
   * @param {{
   *   validFrom?: string,
   *   accredited?: Stretch[],
   *   year?: number
   * }} [overrides]
   */
  const stretches = ({
    validFrom = '2026-01-01',
    accredited = [],
    year = 2026
  } = {}) =>
    registeredOnlyStretches({
      dateRange: { validFrom },
      accredited,
      year,
      now
    })

  it('holds no registered-only time when the accreditation covered the whole year', () => {
    expect(
      stretches({ accredited: [accreditedOver('2025-01-01', '2026-12-31')] })
    ).toStrictEqual([])
  })

  it('leaves the days before an accreditation that started late', () => {
    expect(
      stretches({ accredited: [accreditedOver('2026-03-01', '2026-12-31')] })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-02-28' }])
  })

  it('leaves the days after an accreditation that ended early', () => {
    expect(
      stretches({ accredited: [accreditedOver('2025-01-01', '2026-03-31')] })
    ).toStrictEqual([{ from: '2026-04-01', to: '2026-06-15' }])
  })

  // Two stretches in one year is why this answers a list rather than a pair.
  it('leaves the days either side of an accreditation inside the registration', () => {
    expect(
      stretches({ accredited: [accreditedOver('2026-03-01', '2026-04-30')] })
    ).toStrictEqual([
      { from: '2026-01-01', to: '2026-02-28' },
      { from: '2026-05-01', to: '2026-06-15' }
    ])
  })

  it('subtracts nothing for an accreditation that ran in another year', () => {
    expect(
      stretches({ accredited: [accreditedOver('2024-01-01', '2024-12-31')] })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-06-15' }])
  })

  // The two overlap across March, so the days they share must not reappear as
  // a gap between them. What is left is January, before the first, and June,
  // after the second.
  it('leaves no phantom gap between overlapping accreditations', () => {
    expect(
      stretches({
        accredited: [
          accreditedOver('2026-02-01', '2026-04-30'),
          accreditedOver('2026-03-01', '2026-05-31')
        ]
      })
    ).toStrictEqual([
      { from: '2026-01-01', to: '2026-01-31' },
      { from: '2026-06-01', to: '2026-06-15' }
    ])
  })

  // The second starts the day after the first ends, so 31 March to 1 April is
  // continuous cover rather than a one-day gap.
  it('leaves no one-day gap between abutting accreditations', () => {
    expect(
      stretches({
        accredited: [
          accreditedOver('2026-02-01', '2026-03-31'),
          accreditedOver('2026-04-01', '2026-05-31')
        ]
      })
    ).toStrictEqual([
      { from: '2026-01-01', to: '2026-01-31' },
      { from: '2026-06-01', to: '2026-06-15' }
    ])
  })

  it('opens the stretch when the registration started rather than in January', () => {
    expect(stretches({ validFrom: '2026-02-10' })).toStrictEqual([
      { from: '2026-02-10', to: '2026-06-15' }
    ])
  })

  it('closes an earlier year at 31 December rather than at today', () => {
    expect(stretches({ validFrom: '2025-01-01', year: 2025 })).toStrictEqual([
      { from: '2025-01-01', to: '2025-12-31' }
    ])
  })

  it('holds nothing for a year before the registration started', () => {
    expect(stretches({ validFrom: '2026-01-01', year: 2025 })).toStrictEqual([])
  })

  // Older persisted records carry a full ISO datetime where newer ones carry a
  // bare date, and a datetime sorts after the bare date for the same day. Left
  // unnormalised that reads as "the registration starts after today", and the
  // page tells a regulator the period holds nothing.
  it('reads a start date stored as a full ISO datetime as the day it names', () => {
    expect(stretches({ validFrom: '2026-06-15T00:00:00.000Z' })).toStrictEqual([
      { from: '2026-06-15', to: '2026-06-15' }
    ])
  })

  it('never leaks a datetime into the stretch it answers with', () => {
    expect(
      stretches({
        validFrom: '2026-01-01T00:00:00.000Z',
        accredited: [accreditedOver('2026-03-01', '2026-12-31')]
      })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-02-28' }])
  })
})
