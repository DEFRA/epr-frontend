import { afterEach, describe, it, expect } from 'vitest'
import { config, isReportsEnabled } from './config.js'

describe(isReportsEnabled, () => {
  afterEach(() => {
    config.reset('featureFlags.reports')
  })

  it('should return false by default', () => {
    expect(isReportsEnabled()).toBe(false)
  })

  it('should return true when flag is enabled', () => {
    config.set('featureFlags.reports', true)
    expect(isReportsEnabled()).toBe(true)
  })
})
