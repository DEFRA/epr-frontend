import { describe, expect, it } from 'vitest'
import { getSessionCacheEngineType } from './session.js'

describe(getSessionCacheEngineType, () => {
  it.each([
    ['redis', true],
    ['memory', false]
  ])('should return %s', (value, isProduction) => {
    expect(getSessionCacheEngineType(isProduction)).toBe(value)
  })
})
