import { describe, expect, it } from 'vitest'

import { registeredOnlyStretches } from './registered-only.js'
import {
  accreditedDateRange,
  accreditedStretches,
  registrationAccreditedStretches,
  registrationDateRange
} from './timeline-dates.js'

/**
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
 * @param {Record<string, string>} timeline - status by date
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
  '2025-12-15': 'approved',
  '2026-03-10': 'cancelled',
  '2026-03-30': 'approved',
  '2026-06-01': 'suspended'
})

// Cancelled the year before, then approved again.
const cancelledLastYear = anAccreditation({
  '2025-06-01': 'approved',
  '2025-11-01': 'cancelled',
  '2026-02-01': 'approved'
})

describe(accreditedStretches, () => {
  it('runs from the first approval to 31 December', () => {
    expect(
      accreditedStretches(anAccreditation({ '2026-03-01': 'approved' }), '2026')
    ).toStrictEqual([{ from: '2026-03-01', to: '2026-12-31' }])
  })

  it('starts on 1 January when the first approval was in an earlier year', () => {
    expect(
      accreditedStretches(anAccreditation({ '2025-12-15': 'approved' }), '2026')
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
          '2026-02-01': 'approved',
          '2026-09-30': 'cancelled'
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
          '2026-02-01': 'approved',
          '2026-03-01': 'suspended',
          '2026-04-01': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })

  it('does not count the days before the first approval', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-01-10': 'created',
          '2026-02-01': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })

  it('ends nothing for a cancellation before the first approval', () => {
    expect(
      accreditedStretches(
        anAccreditation({
          '2026-01-10': 'created',
          '2026-01-20': 'cancelled',
          '2026-02-01': 'approved'
        }),
        '2026'
      )
    ).toStrictEqual([{ from: '2026-02-01', to: '2026-12-31' }])
  })
})

describe(accreditedDateRange, () => {
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
          '2026-02-01': 'approved',
          '2026-09-30': 'cancelled'
        }),
        '2026'
      )
    ).toStrictEqual({ validFrom: '2026-02-01', validTo: '2026-09-30' })
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
          2025: anAccreditation({ '2025-03-01': 'approved' }),
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
            '2025-12-01': 'approved',
            '2026-09-30': 'cancelled'
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
            '2026-03-01': 'approved',
            '2026-05-01': 'suspended'
          })
        })
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-02-28' }])
  })

  it('subtracts nothing for an accreditation in another year', () => {
    expect(
      registeredOnly(
        aRegistration('2024-01-01', {
          2024: anAccreditation({ '2024-01-01': 'approved' })
        })
      )
    ).toStrictEqual([{ from: '2026-01-01', to: '2026-12-31' }])
  })
})
