import { describe, expect, it } from 'vitest'

import { calendarDate, utcCalendarDate } from './calendar-date.js'

describe(calendarDate, () => {
  it('keeps a bare date as it is', () => {
    expect(calendarDate('2026-06-15')).toBe('2026-06-15')
  })

  // Older persisted documents carry a full ISO datetime, from historical Joi
  // coercion, and a caller cannot know which shape it has.
  it('reads a full ISO datetime as the day it names', () => {
    expect(calendarDate('2026-06-15T23:59:59.999Z')).toBe('2026-06-15')
  })

  // The whole point of the type: the two shapes for one day must compare equal,
  // because a datetime sorts after the bare date and would read as later.
  it('makes the two shapes for one day compare equal', () => {
    expect(calendarDate('2026-06-15T00:00:00.000Z')).toBe(
      calendarDate('2026-06-15')
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
