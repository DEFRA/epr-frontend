import { afterEach, describe, expect, it, vi } from 'vitest'

import { toCalendarDate } from './calendar-date.js'
import { currentYear, toYear, yearOf } from './year.js'

describe(toYear, () => {
  it('should keep the value it is given', () => {
    expect(toYear(2027)).toBe(2027)
  })
})

describe(currentYear, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should give the UTC calendar year', () => {
    vi.useFakeTimers({
      now: new Date('2027-12-31T23:30:00.000Z'),
      toFake: ['Date']
    })

    expect(currentYear()).toBe(2027)
  })
})

describe(yearOf, () => {
  it('should name the year of the last day of a year', () => {
    expect(yearOf(toCalendarDate('2026-12-31'))).toBe(2026)
  })
})
