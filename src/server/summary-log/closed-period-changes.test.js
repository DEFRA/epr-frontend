import { describe, expect, it } from 'vitest'

import { requiresResubmission } from './closed-period-changes.js'

const ZERO_CHANGE = {
  balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
  nonBalanceAffecting: { count: 0, rows: [] }
}

const closedRows = {
  added: {
    balanceAffecting: { count: 2, tonnageDelta: 4, rows: [] },
    nonBalanceAffecting: { count: 0, rows: [] }
  },
  adjusted: ZERO_CHANGE
}

const loads = (periodsRequiringResubmission) => ({
  openPeriodLoads: { added: ZERO_CHANGE, adjusted: ZERO_CHANGE },
  closedPeriodLoads: closedRows,
  periodsRequiringResubmission
})

describe(requiresResubmission, () => {
  it('returns false when loadsByReportingPeriod is undefined', () => {
    expect(requiresResubmission(undefined)).toBe(false)
  })

  it('returns false when periodsRequiringResubmission is absent', () => {
    expect(
      requiresResubmission({
        openPeriodLoads: { added: ZERO_CHANGE, adjusted: ZERO_CHANGE },
        closedPeriodLoads: closedRows
      })
    ).toBe(false)
  })

  it('returns false when periodsRequiringResubmission is empty despite closed-period rows', () => {
    expect(requiresResubmission(loads([]))).toBe(false)
  })

  it('returns true when periodsRequiringResubmission lists a period', () => {
    expect(requiresResubmission(loads([{ year: 2025, period: 1 }]))).toBe(true)
  })
})
