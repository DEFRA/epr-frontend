import { describe, expect, it } from 'vitest'

import { toYear } from '#server/common/helpers/year.js'

import {
  accreditedDateRange,
  hasRegisteredOnlyTime,
  registeredYears
} from './reg-acc-status.js'

/** @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js' */

/**
 * @param {RegistrationView['regAccStatusByDate']} regAccStatusByDate
 * @returns {RegistrationView}
 */
const served = (regAccStatusByDate) =>
  /** @type {RegistrationView} */ (
    /** @type {unknown} */ ({ regAccStatusByDate })
  )

const registeredOnly = /** @type {const} */ ({ status: 'registeredOnly' })
const accredited = /** @type {const} */ ({ status: 'accredited' })
const cancelled = /** @type {const} */ ({ status: 'cancelled' })

const YEAR = toYear(2026)
const NOW = new Date('2026-06-15T10:00:00.000Z')

describe(registeredYears, () => {
  it('names the years holding an approved day, most recent first', () => {
    expect(
      registeredYears(
        served({
          2025: { '2025-02-01': registeredOnly },
          2026: { '2026-01-01': accredited }
        }),
        NOW
      )
    ).toStrictEqual([2026, 2025])
  })

  it('names no year for a registration never approved', () => {
    expect(registeredYears(served({}), NOW)).toStrictEqual([])
  })

  it('leaves out a year spent wholly cancelled', () => {
    expect(
      registeredYears(
        served({
          2025: { '2025-01-01': registeredOnly },
          2026: { '2026-01-01': cancelled }
        }),
        NOW
      )
    ).toStrictEqual([2025])
  })

  it('leaves out a year that has not started yet', () => {
    expect(
      registeredYears(
        served({
          2026: { '2026-01-01': registeredOnly },
          2027: { '2027-01-01': accredited }
        }),
        NOW
      )
    ).toStrictEqual([2026])
  })

  it('counts today and leaves out tomorrow', () => {
    expect(
      registeredYears(served({ 2026: { '2026-06-15': accredited } }), NOW)
    ).toStrictEqual([2026])
    expect(
      registeredYears(served({ 2026: { '2026-06-16': accredited } }), NOW)
    ).toStrictEqual([])
  })
})

describe(accreditedDateRange, () => {
  it('runs from the first accredited day to 31 December', () => {
    expect(
      accreditedDateRange(
        served({
          2026: { '2026-02-01': registeredOnly, '2026-07-01': accredited }
        }),
        YEAR
      )
    ).toStrictEqual({ validFrom: '2026-07-01', validTo: '2026-12-31' })
  })

  it('ends the day before the status that follows the last accredited day', () => {
    expect(
      accreditedDateRange(
        served({
          2026: { '2026-07-01': accredited, '2026-10-15': registeredOnly }
        }),
        YEAR
      )
    ).toStrictEqual({ validFrom: '2026-07-01', validTo: '2026-10-14' })
  })

  it('spans a gap between two accredited stretches', () => {
    expect(
      accreditedDateRange(
        served({
          2026: {
            '2026-03-01': accredited,
            '2026-05-10': registeredOnly,
            '2026-06-01': accredited,
            '2026-09-01': cancelled
          }
        }),
        YEAR
      )
    ).toStrictEqual({ validFrom: '2026-03-01', validTo: '2026-08-31' })
  })

  it('leaves no period for a year with no accredited day', () => {
    expect(
      accreditedDateRange(
        served({ 2026: { '2026-01-01': registeredOnly } }),
        YEAR
      )
    ).toStrictEqual({ validFrom: null, validTo: null })
  })

  it('leaves no period for a year not served', () => {
    expect(accreditedDateRange(served({}), YEAR)).toStrictEqual({
      validFrom: null,
      validTo: null
    })
  })
})

describe(hasRegisteredOnlyTime, () => {
  it('holds time for a registered-only day up to today', () => {
    expect(
      hasRegisteredOnlyTime(
        served({ 2026: { '2026-06-15': registeredOnly } }),
        YEAR,
        NOW
      )
    ).toBe(true)
  })

  it('holds none for a registered-only day still to come', () => {
    expect(
      hasRegisteredOnlyTime(
        served({ 2026: { '2026-06-16': registeredOnly } }),
        YEAR,
        NOW
      )
    ).toBe(false)
  })

  it('holds none for a year wholly accredited', () => {
    expect(
      hasRegisteredOnlyTime(
        served({ 2026: { '2026-01-01': accredited } }),
        YEAR,
        NOW
      )
    ).toBe(false)
  })

  it('holds none for a year not served', () => {
    expect(hasRegisteredOnlyTime(served({}), YEAR, NOW)).toBe(false)
  })
})
