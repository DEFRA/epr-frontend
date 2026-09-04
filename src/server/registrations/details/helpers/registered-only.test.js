import { describe, expect, it } from 'vitest'

import {
  registeredOnlyStretches,
  registrationYears
} from './registered-only.js'

/**
 * @import { AccreditationResource } from './types.js'
 */

// Every test pins the clock. The helpers run to "today", so a test reading the
// real one would start failing on 1 January.
const now = new Date('2026-06-15T00:00:00Z')

/**
 * @param {string | null} validFrom
 * @param {string | null} [validTo]
 * @returns {AccreditationResource}
 */
const anAccreditation = (validFrom, validTo = null) =>
  /** @type {AccreditationResource} */ ({
    id: 'acc-001',
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved',
    reprocessingType: 'input',
    dateRange: { validFrom, validTo },
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    }
  })

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
   * @param {{
   *   validFrom?: string | null,
   *   accreditations?: AccreditationResource[],
   *   year?: number
   * }} [overrides]
   */
  const stretches = ({
    validFrom = '2026-01-01',
    accreditations = [],
    year = 2026
  } = {}) =>
    registeredOnlyStretches({
      dateRange: { validFrom },
      accreditations,
      year,
      now
    })

  it('holds no registered-only time when the accreditation covered the whole year', () => {
    expect(
      stretches({ accreditations: [anAccreditation('2025-01-01')] })
    ).toStrictEqual([])
  })

  it('leaves the days before an accreditation that started late', () => {
    expect(
      stretches({ accreditations: [anAccreditation('2026-03-01')] })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-02-28' }])
  })

  it('leaves the days after an accreditation that ended early', () => {
    expect(
      stretches({
        accreditations: [anAccreditation('2025-01-01', '2026-03-31')]
      })
    ).toStrictEqual([{ from: '2026-04-01', to: '2026-06-15' }])
  })

  // Two stretches in one year is why this answers a list rather than a pair.
  it('leaves the days either side of an accreditation inside the registration', () => {
    expect(
      stretches({
        accreditations: [anAccreditation('2026-03-01', '2026-04-30')]
      })
    ).toStrictEqual([
      { from: '2026-01-01', to: '2026-02-28' },
      { from: '2026-05-01', to: '2026-06-15' }
    ])
  })

  it('treats an accreditation that never started as occupying nothing', () => {
    expect(
      stretches({ accreditations: [anAccreditation(null)] })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-06-15' }])
  })

  // A cancelled accreditation keeps its dates and did run over them, so the
  // operator was not registered-only then. Keying on current status instead
  // would rewrite history the moment one was cancelled.
  it('counts a cancelled accreditation over the period it names', () => {
    const cancelled = /** @type {AccreditationResource} */ ({
      ...anAccreditation('2026-01-01', '2026-03-31'),
      status: 'cancelled'
    })

    expect(stretches({ accreditations: [cancelled] })).toStrictEqual([
      { from: '2026-04-01', to: '2026-06-15' }
    ])
  })

  it('runs an accreditation with no end date up to today', () => {
    expect(
      stretches({ accreditations: [anAccreditation('2026-03-01', null)] })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-02-28' }])
  })

  it('subtracts nothing for an accreditation that ran in another year', () => {
    expect(
      stretches({
        accreditations: [anAccreditation('2024-01-01', '2024-12-31')]
      })
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-06-15' }])
  })

  // The two overlap across March, so the days they share must not reappear as
  // a gap between them. What is left is January, before the first, and June,
  // after the second.
  it('leaves no phantom gap between overlapping accreditations', () => {
    expect(
      stretches({
        accreditations: [
          anAccreditation('2026-02-01', '2026-04-30'),
          anAccreditation('2026-03-01', '2026-05-31')
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
        accreditations: [
          anAccreditation('2026-02-01', '2026-03-31'),
          anAccreditation('2026-04-01', '2026-05-31')
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

  it('holds nothing for a registration that was never approved', () => {
    expect(stretches({ validFrom: null })).toStrictEqual([])
  })
})
