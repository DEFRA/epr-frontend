import { describe, expect, it } from 'vitest'

import { registeredOnlyStretches } from './registered-only.js'
import {
  accreditedDateRange,
  accreditedStretches,
  dailyTimeline,
  registeredStretches,
  registeredYears,
  registrationAccreditedStretches
} from './timeline-dates.js'

/**
 * @import { AccreditationView, RegistrationView, StatusTimeline } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
 * @param {Record<string, string>} timeline - status by ISO datetime, oldest first
 * @returns {StatusTimeline}
 */
const toStatusTimeline = (timeline) =>
  Object.entries(timeline).map(([at, status]) => ({ status, at }))

/**
 * @param {StatusTimeline} timeline
 * @returns {AccreditationView}
 */
const accreditationWith = (timeline) => ({
  accreditationNumber: 'A26ER5001180114PL',
  status: { current: 'approved', timeline }
})

/**
 * @param {Record<string, string>} timeline - status by ISO datetime
 * @returns {AccreditationView}
 */
const anAccreditation = (timeline) =>
  accreditationWith(toStatusTimeline(timeline))

/**
 * @param {Record<string, string>} timeline - status by ISO datetime
 * @param {Record<string, AccreditationView>} [accreditations]
 * @returns {RegistrationView}
 */
const aRegistration = (timeline, accreditations = {}) => ({
  status: { current: 'approved', timeline: toStatusTimeline(timeline) },
  validFrom: '2020-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'exporter',
  accreditations
})

/**
 * @param {string} date
 * @param {Record<string, AccreditationView>} [accreditations]
 * @returns {RegistrationView}
 */
const approvedOn = (date, accreditations = {}) =>
  aRegistration({ [`${date}T00:00:00.000Z`]: 'approved' }, accreditations)

// Cancelled, then approved again, then suspended.
const reinstated = anAccreditation({
  '2025-12-15T09:00:00.000Z': 'approved',
  '2026-03-10T09:00:00.000Z': 'cancelled',
  '2026-03-30T09:00:00.000Z': 'approved',
  '2026-06-01T09:00:00.000Z': 'suspended'
})

// Created and approved in the same change.
const createdAndApprovedAtOnce = accreditationWith([
  { status: 'created', at: '2026-01-01T00:00:00.000Z' },
  { status: 'approved', at: '2026-01-01T00:00:00.000Z' }
])

// Cancelled the year before, then approved again.
const cancelledLastYear = anAccreditation({
  '2025-06-01T09:00:00.000Z': 'approved',
  '2025-11-01T09:00:00.000Z': 'cancelled',
  '2026-02-01T09:00:00.000Z': 'approved'
})

describe(dailyTimeline, () => {
  it('keys each status by its UTC day', () => {
    expect(
      dailyTimeline([{ status: 'approved', at: '2026-03-01T09:00:00.000Z' }])
    ).toStrictEqual({ '2026-03-01': { status: 'approved' } })
  })

  it('keeps the last status on a day with several transitions', () => {
    expect(
      dailyTimeline([
        { status: 'created', at: '2026-02-01T09:00:00.000Z' },
        { status: 'approved', at: '2026-03-01T09:00:00.000Z' },
        { status: 'cancelled', at: '2026-03-01T15:00:00.000Z' }
      ])
    ).toStrictEqual({
      '2026-02-01': { status: 'created' },
      '2026-03-01': { status: 'cancelled' }
    })
  })

  it('keeps the later of two changes made at the same time', () => {
    expect(
      dailyTimeline([
        { status: 'approved', at: '2026-03-01T09:00:00.000Z' },
        { status: 'suspended', at: '2026-03-01T09:00:00.000Z' }
      ])
    ).toStrictEqual({ '2026-03-01': { status: 'suspended' } })
  })

  it('reads the day from the time without parsing it', () => {
    expect(
      dailyTimeline([
        { status: 'approved', at: '2026-03-01T23:30:00.000-02:00' }
      ])
    ).toStrictEqual({ '2026-03-01': { status: 'approved' } })
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

  it('starts a stretch on a day created and approved at the same time', () => {
    expect(accreditedStretches(createdAndApprovedAtOnce, '2026')).toStrictEqual(
      [{ from: '2026-01-01', to: '2026-12-31' }]
    )
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

  it('ends a stretch the day before the accreditation is re-opened', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-05-01T09:00:00.000Z': 'created',
          '2026-07-01T09:00:00.000Z': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([
      { from: '2026-02-01', to: '2026-04-30' },
      { from: '2026-07-01', to: '2026-12-31' }
    ])
  })

  it('ends a stretch the day before a rejection', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-05-01T09:00:00.000Z': 'rejected'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-04-30' }])
  })

  it('ends on 31 December when the cancellation came the following year', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2027-03-01T09:00:00.000Z': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })

  it('drops a stretch that starts after the year', () => {
    expect(
      accreditedStretches(
        anAccreditation({ '2027-02-01T09:00:00.000Z': 'approved' }),
        '2026'
      )
    ).toStrictEqual([])
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

describe(accreditedDateRange, () => {
  it('ends on the day of a cancellation that follows an earlier transition that day', () => {
    expect(
      accreditedDateRange(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-09-30T09:00:00.000Z': 'suspended',
          '2026-09-30T15:00:00.000Z': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual({ validFrom: '2026-02-01', validTo: '2026-09-30' })
  })

  it('runs from the first stretch to 31 December', () => {
    expect(accreditedDateRange(reinstated, '2026')).toStrictEqual({
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    })
  })

  it('starts on the first approval in the year when an earlier stretch ended the year before', () => {
    expect(accreditedDateRange(cancelledLastYear, '2026')).toStrictEqual({
      validFrom: '2026-02-01',
      validTo: '2026-12-31'
    })
  })

  it('ends on the cancellation date when the last entry is a cancellation', () => {
    expect(
      accreditedDateRange(
        anAccreditation({
          '2026-02-01T09:00:00.000Z': 'approved',
          '2026-09-30T09:00:00.000Z': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual({ validFrom: '2026-02-01', validTo: '2026-09-30' })
  })

  it('starts on the approval day when it was suspended later that day', () => {
    expect(
      accreditedDateRange(
        anAccreditation({
          '2026-01-19T09:00:00.000Z': 'created',
          '2026-01-19T10:00:00.000Z': 'approved',
          '2026-01-19T11:00:00.000Z': 'suspended'
        }),
        '2026'
      )
    ).toStrictEqual({ validFrom: '2026-01-19', validTo: '2026-12-31' })
  })

  it('runs the whole year when created and approved at the same time', () => {
    expect(accreditedDateRange(createdAndApprovedAtOnce, '2026')).toStrictEqual(
      {
        validFrom: '2026-01-01',
        validTo: '2026-12-31'
      }
    )
  })

  it('starts and ends on the day it was approved and cancelled', () => {
    expect(
      accreditedDateRange(
        anAccreditation({
          '2026-03-04T09:00:00.000Z': 'approved',
          '2026-03-04T15:00:00.000Z': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual({ validFrom: '2026-03-04', validTo: '2026-03-04' })
  })
})

describe(registeredYears, () => {
  const now = new Date('2026-06-15T00:00:00Z')

  it('names no year for a registration never approved', () => {
    expect(
      registeredYears(
        aRegistration({ '2025-01-01T00:00:00.000Z': 'created' }),
        now
      )
    ).toStrictEqual([])
  })

  it('runs from the year first approved to the current year, most recent first', () => {
    expect(registeredYears(approvedOn('2024-06-01'), now)).toStrictEqual([
      2026, 2025, 2024
    ])
  })

  it('leaves out a year spent wholly cancelled', () => {
    expect(
      registeredYears(
        aRegistration({
          '2024-01-01T00:00:00.000Z': 'approved',
          '2024-06-01T09:00:00.000Z': 'cancelled',
          '2026-02-01T09:00:00.000Z': 'approved'
        }),
        now
      )
    ).toStrictEqual([2026, 2024])
  })

  it('ends with the year the registration was cancelled in', () => {
    expect(
      registeredYears(
        aRegistration({
          '2024-01-01T00:00:00.000Z': 'approved',
          '2025-03-01T09:00:00.000Z': 'cancelled'
        }),
        now
      )
    ).toStrictEqual([2025, 2024])
  })

  it('names no year for an approval that has not started yet', () => {
    expect(registeredYears(approvedOn('2027-01-01'), now)).toStrictEqual([])
  })
})

describe(registeredStretches, () => {
  const now = new Date('2026-06-15T00:00:00Z')

  it('runs from the approval to today in the current year', () => {
    expect(
      registeredStretches(approvedOn('2026-02-10'), 2026, now)
    ).toStrictEqual([{ from: '2026-02-10', to: '2026-06-15' }])
  })

  it('starts on 1 January when approved in an earlier year', () => {
    expect(
      registeredStretches(approvedOn('2025-04-01'), 2026, now)
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-06-15' }])
  })

  it('closes an earlier year at 31 December rather than at today', () => {
    expect(
      registeredStretches(approvedOn('2025-01-01'), 2025, now)
    ).toStrictEqual([{ from: '2025-01-01', to: '2025-12-31' }])
  })

  it('holds nothing for a year before the approval', () => {
    expect(
      registeredStretches(approvedOn('2026-01-01'), 2025, now)
    ).toStrictEqual([])
  })

  it('leaves out the days the registration was cancelled', () => {
    expect(
      registeredStretches(
        aRegistration({
          '2026-01-01T00:00:00.000Z': 'approved',
          '2026-03-01T09:00:00.000Z': 'cancelled',
          '2026-05-01T09:00:00.000Z': 'approved'
        }),
        2026,
        now
      )
    ).toStrictEqual([
      { from: '2026-01-01', to: '2026-02-28' },
      { from: '2026-05-01', to: '2026-06-15' }
    ])
  })

  it('ends the day before the registration is re-opened', () => {
    expect(
      registeredStretches(
        aRegistration({
          '2026-01-01T00:00:00.000Z': 'approved',
          '2026-04-01T09:00:00.000Z': 'created'
        }),
        2026,
        now
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-03-31' }])
  })
})

describe(registrationAccreditedStretches, () => {
  it("gives every stretch of every year's accreditation", () => {
    expect(
      registrationAccreditedStretches(
        approvedOn('2025-01-01', {
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
      registered: registeredStretches(registration, year, now),
      accredited: registrationAccreditedStretches(registration)
    })

  it('is the cancelled gap of a reinstated accreditation', () => {
    expect(
      registeredOnly(approvedOn('2025-01-01', { 2026: reinstated }))
    ).toStrictEqual([{ from: '2026-03-10', to: '2026-03-29' }])
  })

  it('starts on the day of a final cancellation', () => {
    expect(
      registeredOnly(
        approvedOn('2026-01-01', {
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
      registeredOnly(approvedOn('2025-01-01', { 2026: cancelledLastYear }))
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-01-31' }])
  })

  it('keeps suspended days accredited', () => {
    expect(
      registeredOnly(
        approvedOn('2026-01-01', {
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
        approvedOn('2024-01-01', {
          2024: anAccreditation({ '2024-01-01T09:00:00.000Z': 'approved' })
        })
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-12-31' }])
  })

  it('subtracts nothing in a year for an accreditation cancelled in it the year before', () => {
    expect(
      registeredOnly(
        approvedOn('2026-01-01', {
          2025: anAccreditation({
            '2025-02-01T09:00:00.000Z': 'approved',
            '2026-03-01T09:00:00.000Z': 'cancelled'
          })
        })
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-12-31' }])
  })

  it('holds nothing for the days the registration was cancelled', () => {
    expect(
      registeredOnly(
        aRegistration({
          '2026-01-01T00:00:00.000Z': 'approved',
          '2026-03-01T09:00:00.000Z': 'cancelled',
          '2026-05-01T09:00:00.000Z': 'approved'
        })
      )
    ).toStrictEqual([
      { from: '2026-01-01', to: '2026-02-28' },
      { from: '2026-05-01', to: '2026-12-31' }
    ])
  })
})
