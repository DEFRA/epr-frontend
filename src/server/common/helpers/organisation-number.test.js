import { describe, expect, it } from 'vitest'

import { organisationNumber } from './organisation-number.js'

describe('#organisationNumber', () => {
  it('should keep the value it is given', () => {
    expect(organisationNumber(500123)).toBe(500123)
  })
})
