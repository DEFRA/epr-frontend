import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  adjacentMonths,
  describeMonth,
  describeReportingPeriod,
  isNavigable,
  lastCompleteMonth,
  nameOf,
  reportingPeriod
} from './reporting-period.js'

/** @param {string} iso */
const at = (iso) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 */
const asKey = (key, values) => `translated:${key}:${JSON.stringify(values)}`

describe(nameOf, () => {
  it('names the month a reporting key stands for', () => {
    expect(nameOf('2026-03')).toBe('March')
  })

  // A key carries no day, so a host west of Greenwich reading it locally would
  // land on the last day of the month before.
  it('names the month the same way west of Greenwich', () => {
    expect(nameOf('2026-01')).toBe('January')
  })
})

describe(lastCompleteMonth, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is the month before the one still running', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(lastCompleteMonth()).toStrictEqual({ year: 2026, month: 8 })
  })

  it('is December of the year just ended, through January', () => {
    at('2027-01-15T12:00:00.000Z')

    expect(lastCompleteMonth()).toStrictEqual({ year: 2026, month: 12 })
  })

  // Half past midnight on 1 July in British Summer Time is still 30 June in
  // UTC, so a host reading the month in UTC would stop a month short.
  it('reads the month in UK time rather than UTC', () => {
    at('2026-06-30T23:30:00.000Z')

    expect(lastCompleteMonth()).toStrictEqual({ year: 2026, month: 6 })
  })
})

describe(reportingPeriod, () => {
  it('runs from January of the year to the month asked for', () => {
    expect(reportingPeriod({ year: 2026, month: 3 })).toStrictEqual({
      year: 2026,
      month: 3,
      months: ['2026-01', '2026-02', '2026-03']
    })
  })

  it('is January alone when January is asked for', () => {
    expect(reportingPeriod({ year: 2026, month: 1 })).toStrictEqual({
      year: 2026,
      month: 1,
      months: ['2026-01']
    })
  })
})

describe(isNavigable, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts any month from January 2026 to the last complete one', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(isNavigable({ year: 2026, month: 1 })).toBe(true)
    expect(isNavigable({ year: 2026, month: 5 })).toBe(true)
    expect(isNavigable({ year: 2026, month: 8 })).toBe(true)
  })

  it('refuses the month still running', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(isNavigable({ year: 2026, month: 9 })).toBe(false)
  })

  it('refuses a month before the publication began', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(isNavigable({ year: 2025, month: 12 })).toBe(false)
  })

  // A later year with an earlier month number is still after the ceiling.
  it('refuses a month in a year that has not started', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(isNavigable({ year: 2027, month: 1 })).toBe(false)
  })
})

describe(adjacentMonths, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers the month either side of one in the middle of the range', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(adjacentMonths({ year: 2026, month: 5 })).toStrictEqual({
      previous: { year: 2026, month: 4 },
      next: { year: 2026, month: 6 }
    })
  })

  it('offers nothing earlier than January 2026', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(adjacentMonths({ year: 2026, month: 1 })).toStrictEqual({
      next: { year: 2026, month: 2 }
    })
  })

  it('offers nothing later than the last complete month', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(adjacentMonths({ year: 2026, month: 8 })).toStrictEqual({
      previous: { year: 2026, month: 7 }
    })
  })

  it('crosses the year boundary in both directions', () => {
    at('2027-03-10T09:00:00.000Z')

    expect(adjacentMonths({ year: 2026, month: 12 })).toStrictEqual({
      previous: { year: 2026, month: 11 },
      next: { year: 2027, month: 1 }
    })
    expect(adjacentMonths({ year: 2027, month: 1 })).toStrictEqual({
      previous: { year: 2026, month: 12 },
      next: { year: 2027, month: 2 }
    })
  })
})

describe(describeMonth, () => {
  it('names a month with its year', () => {
    expect(describeMonth({ year: 2026, month: 2 }, asKey)).toBe(
      'translated:regulators:marketInsights:period:month:{"month":"February","year":2026}'
    )
  })
})

describe(describeReportingPeriod, () => {
  it('names the first and last month of a period spanning several', () => {
    expect(
      describeReportingPeriod(
        { year: 2026, month: 3, months: ['2026-01', '2026-02', '2026-03'] },
        asKey
      )
    ).toBe(
      'translated:regulators:marketInsights:period:months:{"from":"January","to":"March","year":2026}'
    )
  })

  it('names the single month a period of one covers', () => {
    expect(
      describeReportingPeriod(
        { year: 2026, month: 1, months: ['2026-01'] },
        asKey
      )
    ).toBe(
      'translated:regulators:marketInsights:period:month:{"month":"January","year":2026}'
    )
  })
})
