import { describe, expect, it } from 'vitest'

import { formatTime, formatUkDateTime } from './format-time.js'

describe(formatTime, () => {
  it('should format afternoon time in 12-hour format', () => {
    expect(formatTime('2026-02-15T15:09:00.000Z')).toBe('3:09pm')
  })

  it('should format morning time', () => {
    expect(formatTime('2026-02-15T09:05:00.000Z')).toBe('9:05am')
  })

  it('should format midnight as 12:00am', () => {
    expect(formatTime('2026-02-15T00:00:00.000Z')).toBe('12:00am')
  })

  it('should format noon as 12:00pm', () => {
    expect(formatTime('2026-02-15T12:00:00.000Z')).toBe('12:00pm')
  })

  it('should pad single-digit minutes', () => {
    expect(formatTime('2026-02-15T14:03:00.000Z')).toBe('2:03pm')
  })

  it('should adjust for BST during summer', () => {
    expect(formatTime('2026-06-15T14:09:00.000Z')).toBe('3:09pm')
  })

  it('should return empty string for null', () => {
    expect(formatTime(/** @type {never} */ (null))).toBe('')
  })

  it('should return empty string for undefined', () => {
    expect(formatTime(/** @type {never} */ (undefined))).toBe('')
  })
})

describe(formatUkDateTime, () => {
  it('resolves a BST instant to the UK offset (UTC+1)', () => {
    expect(formatUkDateTime('2026-09-01T08:30:00.000Z')).toBe('09-01T09:30')
  })

  it('resolves a GMT instant with no offset', () => {
    expect(formatUkDateTime('2026-12-31T23:59:00.000Z')).toBe('12-31T23:59')
  })

  it('crosses into the next UK day when UTC has not yet reached it (BST)', () => {
    expect(formatUkDateTime('2026-08-31T23:59:00.000Z')).toBe('09-01T00:59')
  })

  it('accepts Date, epoch-ms and offset ISO string inputs equally', () => {
    const date = new Date('2026-09-01T08:30:00.000Z')

    expect(formatUkDateTime(date)).toBe('09-01T09:30')
    expect(formatUkDateTime(date.getTime())).toBe('09-01T09:30')
    expect(formatUkDateTime('2026-09-01T14:00:00+05:30')).toBe('09-01T09:30')
  })

  it.each([null, undefined, '', 'not a date'])(
    'returns empty string for invalid input %s',
    (value) => {
      expect(formatUkDateTime(value)).toBe('')
    }
  )
})
