import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { config } from '#config/config.js'

import { latestOpenYear, toYear } from './year.js'

describe(toYear, () => {
  it('should keep the value it is given', () => {
    expect(toYear(2027)).toBe(2027)
  })
})

describe(latestOpenYear, () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2027-12-31T23:30:00.000Z'),
      toFake: ['Date']
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    config.reset('openNextYear')
  })

  it('should give the UTC calendar year', () => {
    expect(latestOpenYear()).toBe(2027)
  })

  it('should give the year after when next year is open', () => {
    config.set('openNextYear', true)

    expect(latestOpenYear()).toBe(2028)
  })
})
