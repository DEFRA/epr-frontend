import { describe, expect, it } from 'vitest'

import { availableForPool } from './available-for-pool.js'

describe(availableForPool, () => {
  it('returns the December pool when useDecemberBalance is true', () => {
    const balance = {
      amount: 60,
      availableAmount: 60,
      decemberAmount: 50,
      decemberAvailableAmount: 50,
      nonDecemberAvailableAmount: 10
    }

    expect(availableForPool(balance, true)).toBe(50)
  })

  it('returns the backend-derived non-December pool', () => {
    const balance = {
      amount: 80,
      availableAmount: 80,
      decemberAmount: 50,
      decemberAvailableAmount: 50,
      nonDecemberAvailableAmount: 30
    }

    expect(availableForPool(balance, false)).toBe(30)
  })

  it('treats an absent December portion as zero and the total as the general pool', () => {
    const balance = { amount: 10, availableAmount: 10 }

    expect(availableForPool(balance, true)).toBe(0)
    expect(availableForPool(balance, false)).toBe(10)
  })

  it('defaults useDecemberBalance to falsy, returning the non-December pool', () => {
    const balance = {
      amount: 60,
      availableAmount: 60,
      decemberAvailableAmount: 50,
      nonDecemberAvailableAmount: 10
    }

    expect(availableForPool(balance)).toBe(10)
  })
})
