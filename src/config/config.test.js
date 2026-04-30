import { afterEach, describe, it, expect } from 'vitest'
import { config, isProductionEnvironment, isReportsEnabled } from './config.js'

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

describe(isProductionEnvironment, () => {
  afterEach(() => {
    config.reset('cdpEnvironment')
  })

  it('should return true when cdpEnvironment is prod', () => {
    config.set('cdpEnvironment', 'prod')

    expect(isProductionEnvironment()).toBe(true)
  })

  it.each([
    'local',
    'infra-dev',
    'management',
    'dev',
    'test',
    'perf-test',
    'ext-test'
  ])('should return false when cdpEnvironment is %s', (env) => {
    config.set('cdpEnvironment', env)

    expect(isProductionEnvironment()).toBe(false)
  })
})
