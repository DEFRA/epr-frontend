import { describe, expect, it } from 'vitest'
import { getSessionCacheEngineType } from './session.js'

describe(getSessionCacheEngineType, () => {
  it.each([
    ['redis', { isProduction: true }],
    ['memory', { isProduction: false }]
  ])('should return %s', (value, config) => {
    expect(getSessionCacheEngineType(config)).toBe(value)
  })
})
