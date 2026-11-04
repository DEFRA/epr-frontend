import { describe, expect, it } from 'vitest'

import { dayBefore, toCalendarDate, utcCalendarDate } from './calendar-date.js'

describe(toCalendarDate, () => {
  it('keeps a bare date as it is', () => {
    expect(toCalendarDate('2026-06-15')).toBe('2026-06-15')
  })

  // Older persisted documents carry a full ISO datetime, from historical Joi
  // coercion, and a caller cannot know which shape it has.
  it('reads a full ISO datetime as the day it names', () => {
    expect(toCalendarDate('2026-06-15T23:59:59.999Z')).toBe('2026-06-15')
  })

  // The whole point of the type: the two shapes for one day must compare equal,
  // because a datetime sorts after the bare date and would read as later.
  it('makes the two shapes for one day compare equal', () => {
    expect(toCalendarDate('2026-06-15T00:00:00.000Z')).toBe(
      toCalendarDate('2026-06-15')
    )
  })
})

describe(utcCalendarDate, () => {
  it('names the day an instant falls on', () => {
    expect(utcCalendarDate(new Date('2026-06-15T12:00:00.000Z'))).toBe(
      '2026-06-15'
    )
  })

  // Named for the zone because the answer is zone-dependent: half past midnight
  // on a British summer morning is still the previous day in UTC.
  it('answers in UTC rather than in UK local time', () => {
    expect(utcCalendarDate(new Date('2026-06-16T00:30:00.000+01:00'))).toBe(
      '2026-06-15'
    )
  })
})

describe(dayBefore, () => {
  it('names the previous day', () => {
    expect(dayBefore(toCalendarDate('2026-06-15'))).toBe('2026-06-14')
  })

  it('crosses into the previous month and year', () => {
    expect(dayBefore(toCalendarDate('2026-03-01'))).toBe('2026-02-28')
    expect(dayBefore(toCalendarDate('2026-01-01'))).toBe('2025-12-31')
  })
})
