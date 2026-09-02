import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { toDateRange } from './date-range.js'

const localise = createMockLocalise({
  'registrations:details:current': 'Current'
})

describe(toDateRange, () => {
  it('names the period between both bounds', () => {
    expect(
      toDateRange({ validFrom: '2026-07-01', validTo: '2026-12-31' }, localise)
    ).toBe('1 July 2026 - 31 December 2026')
  })

  it('reads a record with no end as current', () => {
    expect(
      toDateRange({ validFrom: '2026-07-01', validTo: null }, localise)
    ).toBe('1 July 2026 - Current')
  })

  it('names no period for a record that has not started', () => {
    expect(toDateRange({ validFrom: null, validTo: null }, localise)).toBe('')
  })
})
