import { describe, expect, it } from 'vitest'

import { isNil } from './is-nil.js'

describe(isNil, () => {
  it('should return true for null', () => {
    expect(isNil(null)).toBe(true)
  })

  it('should return true for undefined', () => {
    expect(isNil(undefined)).toBe(true)
  })

  it.each([
    { value: 0, label: '0' },
    { value: '', label: 'empty string' },
    { value: false, label: 'false' },
    { value: NaN, label: 'NaN' },
    { value: {}, label: 'empty object' },
    { value: [], label: 'empty array' }
  ])('should return false for $label', ({ value }) => {
    expect(isNil(value)).toBe(false)
  })
})
