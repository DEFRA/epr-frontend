import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { toDateRange } from './date-range.js'

const localise = createMockLocalise({
  'registrations:details:current': 'Current',
  'registrations:details:period': '{{from}} to {{to}}'
})

describe(toDateRange, () => {
  it('names the year once when both bounds fall in it', () => {
    expect(
      toDateRange({ validFrom: '2026-07-01', validTo: '2026-12-31' }, localise)
    ).toBe('1 July to 31 December 2026')
  })

  it('names both years when the period crosses one', () => {
    expect(
      toDateRange({ validFrom: '2025-07-01', validTo: '2026-06-30' }, localise)
    ).toBe('1 July 2025 to 30 June 2026')
  })

  it('reads a record with no end as current', () => {
    expect(
      toDateRange({ validFrom: '2026-07-01', validTo: null }, localise)
    ).toBe('1 July 2026 to Current')
  })

  it('names no period for a record that has not started', () => {
    expect(toDateRange({ validFrom: null, validTo: null }, localise)).toBe('')
  })
})
