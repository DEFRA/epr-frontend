import { describe, expect, it } from 'vitest'

import { toRegistrationNumber } from './registration-number.js'

describe(toRegistrationNumber, () => {
  it('should keep the value it is given', () => {
    expect(toRegistrationNumber('R26ER5001180041PL')).toBe('R26ER5001180041PL')
  })
})
