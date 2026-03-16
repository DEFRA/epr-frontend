import { describe, expect, it } from 'vitest'

import { formatDate } from './format-date.js'

describe(formatDate, () => {
  it('should format a date with year by default', () => {
    expect(formatDate('2026-02-15T15:09:00.000Z')).toBe('15 February 2026')
  })

  it('should format the first day of the year', () => {
    expect(formatDate('2026-01-01T00:00:00.000Z')).toBe('1 January 2026')
  })

  it('should format date-only strings', () => {
    expect(formatDate('2025-12-25')).toBe('25 December 2025')
  })

  it('should use UTC to avoid timezone shifts', () => {
    expect(formatDate('2026-03-01T00:30:00.000Z')).toBe('1 March 2026')
  })

  it('should omit year when includeYear is false', () => {
    expect(formatDate('2026-02-15T15:09:00.000Z', { includeYear: false })).toBe(
      '15 February'
    )
  })
})
