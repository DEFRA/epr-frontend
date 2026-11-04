import { describe, expect, it } from 'vitest'

import { toAccreditationNumber } from './accreditation-number.js'

describe(toAccreditationNumber, () => {
  it('should keep the value it is given', () => {
    expect(toAccreditationNumber('A26ER5001180041PL')).toBe('A26ER5001180041PL')
  })
})
