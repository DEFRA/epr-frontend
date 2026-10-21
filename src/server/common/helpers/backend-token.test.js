import { describe, expect, it } from 'vitest'

import { toBackendToken } from './backend-token.js'

describe(toBackendToken, () => {
  it('should keep the value it is given', () => {
    expect(toBackendToken('a-token')).toBe('a-token')
  })
})
