import { describe, expect, it } from 'vitest'

import { toOrganisationNumber } from './organisation-number.js'

describe(toOrganisationNumber, () => {
  it('should keep the value it is given', () => {
    expect(toOrganisationNumber('500123')).toBe('500123')
  })
})
