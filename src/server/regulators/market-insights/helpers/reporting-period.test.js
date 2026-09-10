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

  it('runs from January to the last complete month of the year in progress', () => {
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

  it('has no complete month yet in January', () => {
    at('2027-01-15T12:00:00.000Z')

    expect(reportingPeriodNow()).toStrictEqual({ year: 2027, months: [] })
  })

  // The reporting year turns at UK midnight, so a moment that is still
  // December here belongs to the year that is ending.
  it('reads the year and month in UK time', () => {
    at('2026-12-31T23:30:00.000Z')

    expect(reportingPeriodNow().year).toBe(2026)
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

  it('falls back to the year when no month of it has finished', () => {
    expect(describeReportingPeriod({ year: 2027, months: [] }, asKey)).toBe(
      'translated:regulators:marketInsights:period:year:{"year":2027}'
    )
  })
})
