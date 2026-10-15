import { describe, expect, it } from 'vitest'

import { registeredOnlyStretches } from './registered-only.js'
import {
  accreditedStretches,
  dailyTimeline,
  registrationAccreditedStretches,
  registrationDateRange
} from './timeline-dates.js'

/**
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
 * @param {Record<string, string>} timeline - status by ISO datetime
 * @returns {AccreditationView}
 */
const anAccreditation = (timeline) => ({
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  statusTimeline: Object.fromEntries(
    Object.entries(timeline).map(([date, status]) => [date, { status }])
  )
})

/**
 * @param {string} validFrom
 * @param {Record<string, AccreditationView>} [accreditations]
 * @returns {RegistrationView}
 */
const aRegistration = (validFrom, accreditations = {}) => ({
  status: 'approved',
  validFrom,
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'exporter',
  accreditations
})

// Cancelled, then approved again, then suspended.
const reinstated = anAccreditation({
  '2025-12-15T09:00:00.000Z': 'approved',
  '2026-03-10T09:00:00.000Z': 'cancelled',
  '2026-03-30T09:00:00.000Z': 'approved',
  '2026-06-01T09:00:00.000Z': 'suspended'
})

// Cancelled the year before, then approved again.
const cancelledLastYear = anAccreditation({
  '2025-06-01T09:00:00.000Z': 'approved',
  '2025-11-01T09:00:00.000Z': 'cancelled',
  '2026-02-01T09:00:00.000Z': 'approved'
})

describe(dailyTimeline, () => {
  it('keys each status by its UTC day', () => {
    expect(
      dailyTimeline({ '2026-03-01T09:00:00.000Z': { status: 'approved' } })
    ).toStrictEqual({ '2026-03-01': { status: 'approved' } })
  })

  it('keeps the last status on a day with several transitions', () => {
    expect(
      dailyTimeline({
        '2026-03-01T15:00:00.000Z': { status: 'cancelled' },
        '2026-03-01T09:00:00.000Z': { status: 'approved' },
        '2026-02-01T09:00:00.000Z': { status: 'created' }
      })
    ).toStrictEqual({
      '2026-02-01': { status: 'created' },
      '2026-03-01': { status: 'cancelled' }
    })
  })

  it('orders the days chronologically whatever order the keys arrive in', () => {
    expect(
      Object.keys(
        dailyTimeline({
          '2026-06-01T09:00:00.000Z': { status: 'suspended' },
          '2026-02-01T09:00:00.000Z': { status: 'approved' }
        })
      )
    ).toStrictEqual(['2026-02-01', '2026-06-01'])
  })
})

describe(accreditedStretches, () => {
  it('counts a day approved then cancelled as cancelled from that day', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-05-01T09:00:00.000Z': 'approved',
          '2026-05-01T15:00:00.000Z': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-04-30' }])
  })

  it('counts a day cancelled then approved again as approved', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-03-01T09:00:00.000Z': 'cancelled',
          '2026-05-01T09:00:00.000Z': 'cancelled',
          '2026-05-01T15:00:00.000Z': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([
      { from: '2026-02-01', to: '2026-02-28' },
      { from: '2026-05-01', to: '2026-12-31' }
    ])
  })

  it('reads keys out of order chronologically', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-09-30T09:00:00.000Z': 'cancelled',
          '2026-02-01T09:00:00.000Z': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-09-29' }])
  })

  it('runs from the first approval to 31 December', () => {
    expect(
      accreditedStretches(
        anAccreditation({ '2026-03-01T09:00:00.000Z': 'approved' }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-03-01', to: '2026-12-31' }])
  })

  it('starts on 1 January when the first approval was in an earlier year', () => {
    expect(
      accreditedStretches(
        anAccreditation({ '2025-12-15T09:00:00.000Z': 'approved' }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-12-31' }])
  })

  it('drops a stretch that ended before the year began', () => {
    expect(accreditedStretches(cancelledLastYear, '2026')).toStrictEqual([
      { from: '2026-02-01', to: '2026-12-31' }
    ])
  })

  it('ends the day before a final cancellation', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-09-30T09:00:00.000Z': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-09-29' }])
  })

  it('leaves a cancelled gap between two stretches', () => {
    expect(accreditedStretches(reinstated, '2026')).toStrictEqual([
      { from: '2026-01-01', to: '2026-03-09' },
      { from: '2026-03-30', to: '2026-12-31' }
    ])
  })

  it('does not split a stretch for a suspension and a re-approval', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-03-01T09:00:00.000Z': 'suspended',
          '2026-04-01T09:00:00.000Z': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })

  it('starts a stretch on a day approved then suspended', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-01-19T00:00:00.000Z': 'created',
          '2026-01-19T00:00:00.001Z': 'approved',
          '2026-01-19T17:06:55.419Z': 'suspended'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-01-19', to: '2026-12-31' }])
  })

  it('does not count the days before the first approval', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-01-10T09:00:00.000Z': 'created',
          '2026-02-01T09:00:00.000Z': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })

  it('ends nothing for a cancellation before the first approval', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-01-10T09:00:00.000Z': 'created',
          '2026-01-20T09:00:00.000Z': 'cancelled',
          '2026-02-01T09:00:00.000Z': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })
})

describe(registrationDateRange, () => {
  it('starts when the registration did', () => {
    expect(registrationDateRange(aRegistration('2025-04-01'))).toStrictEqual({
      validFrom: '2025-04-01'
    })
  })
})

describe(registrationAccreditedStretches, () => {
  it("gives every stretch of every year's accreditation", () => {
    expect(
      registrationAccreditedStretches(
        aRegistration('2025-01-01', {
          2025: anAccreditation({ '2025-03-01T09:00:00.000Z': 'approved' }),
          2026: reinstated
        })
      )
    ).toStrictEqual([
      { from: '2025-03-01', to: '2025-12-31' },
      { from: '2026-01-01', to: '2026-03-09' },
      { from: '2026-03-30', to: '2026-12-31' }
    ])
  })
})

describe('registered-only time from timelines', () => {
  const now = new Date('2026-12-31T00:00:00Z')

  /**
   * @param {RegistrationView} registration
   * @param {number} [year]
   */
  const registeredOnly = (registration, year = 2026) =>
    registeredOnlyStretches({
      dateRange: registrationDateRange(registration),
      accredited: registrationAccreditedStretches(registration),
      year,
      now
    })

  it('is the cancelled gap of a reinstated accreditation', () => {
    expect(
      registeredOnly(aRegistration('2025-01-01', { 2026: reinstated }))
    ).toStrictEqual([{ from: '2026-03-10', to: '2026-03-29' }])
  })

  it('starts on the day of a final cancellation', () => {
    expect(
      registeredOnly(
        aRegistration('2026-01-01', {
          2026: anAccreditation({
            '2025-12-01T09:00:00.000Z': 'approved',
            '2026-09-30T09:00:00.000Z': 'cancelled'
          })
        })
      )
    ).toStrictEqual([{ from: '2026-09-30', to: '2026-12-31' }])
  })

  it('is the days before a re-approval when the earlier stretch ended the year before', () => {
    expect(
      registeredOnly(aRegistration('2025-01-01', { 2026: cancelledLastYear }))
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-01-31' }])
  })

  it('keeps suspended days accredited', () => {
    expect(
      registeredOnly(
        aRegistration('2026-01-01', {
          2026: anAccreditation({
            '2026-03-01T09:00:00.000Z': 'approved',
            '2026-05-01T09:00:00.000Z': 'suspended'
          })
        })
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-02-28' }])
  })

  it('subtracts nothing for an accreditation in another year', () => {
    expect(
      registeredOnly(
        aRegistration('2024-01-01', {
          2024: anAccreditation({ '2024-01-01T09:00:00.000Z': 'approved' })
        })
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-12-31' }])
  })
})
