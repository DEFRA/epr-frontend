import { describe, expect, it } from 'vitest'

import { formatPeriodLabel } from './format-period-label.js'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

function localise(key, params = {}) {
  const monthMatch = key.match(/^reports:months\.(\d+)$/)

  if (monthMatch) {
    return MONTH_NAMES[Number(monthMatch[1]) - 1]
  }

  if (key === 'reports:quarterlyPeriod') {
    return `Quarter ${params.number}, ${params.year}`
  }

  return key
}

describe(formatPeriodLabel, () => {
  it.each([
    {
      cadence: 'monthly',
      period: {
        year: 2026,
        period: 1,
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      },
      expected: 'January 2026'
    },
    {
      cadence: 'monthly',
      period: {
        year: 2026,
        period: 6,
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      },
      expected: 'June 2026'
    },
    {
      cadence: 'monthly',
      period: {
        year: 2025,
        period: 12,
        startDate: '2025-12-01',
        endDate: '2025-12-31'
      },
      expected: 'December 2025'
    },
    {
      cadence: 'quarterly',
      period: {
        year: 2026,
        period: 1,
        startDate: '2026-01-01',
        endDate: '2026-03-31'
      },
      expected: 'Quarter 1, 2026'
    },
    {
      cadence: 'quarterly',
      period: {
        year: 2026,
        period: 4,
        startDate: '2026-10-01',
        endDate: '2026-12-31'
      },
      expected: 'Quarter 4, 2026'
    }
  ])(
    'should return "$expected" for $cadence period $period.period',
    ({ period, cadence, expected }) => {
      expect(formatPeriodLabel(period, cadence, localise)).toBe(expected)
    }
  )
})
