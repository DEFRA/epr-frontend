import { describe, expect, it } from 'vitest'

import { toYear } from './year.js'

describe(toYear, () => {
  it('should keep the value it is given', () => {
    expect(toYear(2027)).toBe(2027)
  })
})
