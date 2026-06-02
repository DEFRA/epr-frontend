import { describe, expect, it } from 'vitest'
import { isAccreditationActive } from './accreditation-helpers.js'

describe(isAccreditationActive, () => {
  it.each([
    { status: 'approved', expected: true },
    { status: 'suspended', expected: true },
    { status: 'created', expected: false },
    { status: 'rejected', expected: false },
    { status: 'cancelled', expected: false }
  ])(
    'returns $expected for accreditation with status "$status"',
    ({ status, expected }) => {
      expect(isAccreditationActive({ status })).toBe(expected)
    }
  )

  it('returns false for undefined', () => {
    expect(isAccreditationActive(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAccreditationActive(null)).toBe(false)
  })
})
