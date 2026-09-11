import { describe, expect, it } from 'vitest'

import { availableForPool } from './available-for-pool.js'

describe(availableForPool, () => {
  it('returns the December pool when useDecemberBalance is true', () => {
    const balance = {
      amount: 60,
      availableAmount: 60,
      decemberAmount: 50,
      decemberAvailableAmount: 50
    }

    expect(availableForPool(balance, true)).toBe(50)
  })

  it('returns the derived non-December pool, reserving December out of the total', () => {
    const balance = {
      amount: 80,
      availableAmount: 80,
      decemberAmount: 50,
      decemberAvailableAmount: 50
    }

    expect(availableForPool(balance, false)).toBe(30)
  })

  it('treats an absent December pool as zero, matching pre-December behaviour', () => {
    const balance = { amount: 10, availableAmount: 10 }

    expect(availableForPool(balance, true)).toBe(0)
    expect(availableForPool(balance, false)).toBe(10)
  })

  it('defaults useDecemberBalance to falsy, returning the general pool', () => {
    const balance = {
      amount: 60,
      availableAmount: 60,
      decemberAvailableAmount: 50
    }

    expect(availableForPool(balance)).toBe(10)
  })
})
