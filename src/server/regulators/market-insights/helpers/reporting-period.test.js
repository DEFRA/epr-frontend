import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  describeReportingPeriod,
  nameOf,
  reportingPeriodNow
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

describe(reportingPeriodNow, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs from January to the last complete month', () => {
    at('2026-09-10T09:00:00.000Z')

    expect(reportingPeriodNow()).toStrictEqual({
      year: 2026,
      months: [
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08'
      ]
    })
  })

  it('leaves out the month still running', () => {
    at('2026-02-28T23:59:00.000Z')

    expect(reportingPeriodNow()).toStrictEqual({
      year: 2026,
      months: ['2026-01']
    })
  })

  // The year comes from the last complete month, not from today, so January
  // shows the year that has just closed in full rather than an empty page.
  it('shows the whole of the year just ended, through January', () => {
    at('2027-01-15T12:00:00.000Z')

    expect(reportingPeriodNow()).toStrictEqual({
      year: 2026,
      months: [
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10',
        '2026-11',
        '2026-12'
      ]
    })
  })

  // Half past midnight on 1 July in British Summer Time is still 30 June in
  // UTC, so a host reading the month in UTC would stop the period a month short.
  it('reads the month in UK time rather than UTC', () => {
    at('2026-06-30T23:30:00.000Z')

    expect(reportingPeriodNow().months).toContain('2026-06')
  })
})

describe(describeReportingPeriod, () => {
  it('names the first and last month of a period spanning several', () => {
    expect(
      describeReportingPeriod(
        { year: 2026, months: ['2026-01', '2026-02', '2026-03'] },
        asKey
      )
    ).toBe(
      'translated:regulators:marketInsights:period:months:{"from":"January","to":"March","year":2026}'
    )
  })

  it('names the single month a period of one covers', () => {
    expect(
      describeReportingPeriod({ year: 2026, months: ['2026-01'] }, asKey)
    ).toBe(
      'translated:regulators:marketInsights:period:month:{"month":"January","year":2026}'
    )
  })
})
