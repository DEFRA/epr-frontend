import { describe, expect, it } from 'vitest'

import { year } from './year.js'

describe('#year', () => {
  it('should keep the value it is given', () => {
    expect(year(2027)).toBe(2027)
  })
})
