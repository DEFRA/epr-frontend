import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { REG_ACC_STATUS } from '#domain/organisations/model.js'
import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toYear } from '#server/common/helpers/year.js'
import { buildAccreditationView } from '#server/common/test-helpers/organisation-view-fixtures.js'

import {
  accreditationEntries,
  accreditedDateRange,
  registeredYears
} from './registration-years.js'

/** @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js' */

/**
 * @param {RegistrationView['regAccStatusByDate']} regAccStatusByDate
 * @returns {RegistrationView}
 */
const served = (regAccStatusByDate) =>
  /** @type {RegistrationView} */ (
    /** @type {unknown} */ ({ regAccStatusByDate })
  )

const registeredOnly = { status: REG_ACC_STATUS.REGISTERED_ONLY }
const accredited = { status: REG_ACC_STATUS.ACCREDITED }
const cancelled = { status: REG_ACC_STATUS.CANCELLED }

const YEAR = toYear(2026)
const NOW = new Date('2026-06-15T10:00:00.000Z')

/**
 * @param {string} accreditationNumber
 */
const accreditationNumbered = (accreditationNumber) =>
  buildAccreditationView({
    accreditationNumber: toAccreditationNumber(accreditationNumber)
  })

describe(accreditationEntries, () => {
  it('pairs each accreditation with the year it is keyed by, as a number', () => {
    const accreditation2025 = accreditationNumbered('A25ER5001180114PL')
    const accreditation2026 = accreditationNumbered('A26ER5001180114PL')

    expect(
      accreditationEntries({ 2026: accreditation2026, 2025: accreditation2025 })
    ).toStrictEqual([
      [2025, accreditation2025],
      [2026, accreditation2026]
    ])
  })
})

describe(registeredYears, () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('names the years holding an approved day, most recent first', () => {
    expect(
      registeredYears(
        served({
          2025: { '2025-02-01': registeredOnly },
          2026: { '2026-01-01': accredited }
        })
      )
    ).toStrictEqual([2026, 2025])
  })

  it('names no year for a registration never approved', () => {
    expect(registeredYears(served({}))).toStrictEqual([])
  })

  it('leaves out a year spent wholly cancelled', () => {
    expect(
      registeredYears(
        served({
          2025: { '2025-01-01': registeredOnly },
          2026: { '2026-01-01': cancelled }
        })
      )
    ).toStrictEqual([2025])
  })

  it('leaves out a year that has not started yet', () => {
    expect(
      registeredYears(
        served({
          2026: { '2026-01-01': registeredOnly },
          2027: { '2027-01-01': accredited }
        })
      )
    ).toStrictEqual([2026])
  })

  it('counts today and leaves out tomorrow', () => {
    expect(
      registeredYears(served({ 2026: { '2026-06-15': accredited } }))
    ).toStrictEqual([2026])
    expect(
      registeredYears(served({ 2026: { '2026-06-16': accredited } }))
    ).toStrictEqual([])
  })

  it('names only the years holding a day in the statuses asked for', () => {
    expect(
      registeredYears(
        served({
          2025: { '2025-01-01': accredited },
          2026: { '2026-06-15': registeredOnly }
        }),
        [REG_ACC_STATUS.REGISTERED_ONLY]
      )
    ).toStrictEqual([2026])
  })

  it('leaves out a year whose day in the status asked for is still to come', () => {
    expect(
      registeredYears(
        served({
          2026: { '2026-01-01': accredited, '2026-06-16': registeredOnly }
        }),
        [REG_ACC_STATUS.REGISTERED_ONLY]
      )
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
