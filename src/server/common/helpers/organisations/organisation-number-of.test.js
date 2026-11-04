import { describe, expect, it } from 'vitest'

import { organisationNumberOf } from './organisation-number-of.js'

describe(organisationNumberOf, () => {
  it('should read the backend organisation id as an organisation number', () => {
    expect(organisationNumberOf({ orgId: 500001 })).toBe('500001')
  })
})
