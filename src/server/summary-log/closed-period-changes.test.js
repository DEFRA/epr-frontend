import { describe, expect, it } from 'vitest'

import { hasClosedPeriodChanges } from './closed-period-changes.js'

const ZERO_CHANGE = {
  balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
  nonBalanceAffecting: { count: 0, rows: [] }
}

const change = (balanceCount, nonBalanceCount) => ({
  balanceAffecting: { count: balanceCount, tonnageDelta: 0, rows: [] },
  nonBalanceAffecting: { count: nonBalanceCount, rows: [] }
})

const loads = (closed) => ({
  openPeriodLoads: { added: ZERO_CHANGE, adjusted: ZERO_CHANGE },
  closedPeriodLoads: closed
})

describe(hasClosedPeriodChanges, () => {
  it('returns false when loadsByReportingPeriod is undefined', () => {
    expect(hasClosedPeriodChanges(undefined)).toBe(false)
  })

  it('returns false when the closed period has no added or adjusted loads', () => {
    expect(
      hasClosedPeriodChanges(
        loads({ added: ZERO_CHANGE, adjusted: ZERO_CHANGE })
      )
    ).toBe(false)
  })

  it('returns true when the closed period has new (added) loads', () => {
    expect(
      hasClosedPeriodChanges(
        loads({ added: change(1, 0), adjusted: ZERO_CHANGE })
      )
    ).toBe(true)
  })

  it('returns true when the closed period has only non-balance-affecting adjusted loads', () => {
    expect(
      hasClosedPeriodChanges(
        loads({ added: ZERO_CHANGE, adjusted: change(0, 2) })
      )
    ).toBe(true)
  })
})
