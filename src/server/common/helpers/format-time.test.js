import { describe, expect, it } from 'vitest'

import { formatTime } from './format-time.js'

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
    expect(formatTime(null)).toBe('')
  })

  it('should return empty string for undefined', () => {
    expect(formatTime(undefined)).toBe('')
  })
})
