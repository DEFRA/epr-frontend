import { describe, expect, it } from 'vitest'

import { formatDate, formatDateShort, toCalendarDate } from './format-date.js'

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

  it('should return empty string for null input', () => {
    expect(formatDate(null)).toBe('')
  })

  it('should return empty string for undefined input', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('should return empty string for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe(formatDateShort, () => {
  it('should format a date with short month and year by default', () => {
    expect(formatDateShort('2026-02-15T15:09:00.000Z')).toBe('15 Feb 2026')
  })

  it('should format the first day of the year', () => {
    expect(formatDateShort('2026-01-01T00:00:00.000Z')).toBe('1 Jan 2026')
  })

  it('should format date-only strings', () => {
    expect(formatDateShort('2025-12-25')).toBe('25 Dec 2025')
  })

  it('should use UTC to avoid timezone shifts', () => {
    expect(formatDateShort('2026-03-01T00:30:00.000Z')).toBe('1 Mar 2026')
  })

  it('should omit year when includeYear is false', () => {
    expect(
      formatDateShort('2026-02-15T15:09:00.000Z', { includeYear: false })
    ).toBe('15 Feb')
  })

  it('should return empty string for null input', () => {
    expect(formatDateShort(null)).toBe('')
  })

  it('should return empty string for undefined input', () => {
    expect(formatDateShort(undefined)).toBe('')
  })

  it('should return empty string for invalid date string', () => {
    expect(formatDateShort('not-a-date')).toBe('')
  })
})

describe(toCalendarDate, () => {
  it('should return the UTC calendar date for a start-of-day instant', () => {
    expect(toCalendarDate(new Date('2025-01-31T00:00:00.000Z'))).toBe(
      '2025-01-31'
    )
  })

  it('should return the UTC calendar date for an end-of-day instant', () => {
    expect(toCalendarDate(new Date('2025-01-31T23:59:59.999Z'))).toBe(
      '2025-01-31'
    )
  })
})
