import { describe, expect, it } from 'vitest'
import { isSessionMatch } from './is-session-match.js'

const duration = { year: 2026, cadence: 'quarterly', period: 1 }

describe('#isSessionMatch', () => {
  it('should return true when all fields match', () => {
    const sessionData = { year: 2026, cadence: 'quarterly', period: 1 }
    expect(isSessionMatch(sessionData, duration)).toBe(true)
  })

  it('should return false when session data is undefined', () => {
    expect(isSessionMatch(undefined, duration)).toBe(false)
  })

  it('should return false when session data is null', () => {
    expect(isSessionMatch(null, duration)).toBe(false)
  })

  it('should return false when year does not match', () => {
    const sessionData = { year: 2025, cadence: 'quarterly', period: 1 }
    expect(isSessionMatch(sessionData, duration)).toBe(false)
  })

  it('should return false when cadence does not match', () => {
    const sessionData = { year: 2026, cadence: 'monthly', period: 1 }
    expect(isSessionMatch(sessionData, duration)).toBe(false)
  })

  it('should return false when period does not match', () => {
    const sessionData = { year: 2026, cadence: 'quarterly', period: 2 }
    expect(isSessionMatch(sessionData, duration)).toBe(false)
  })
})
