import { afterEach, describe, it, expect } from 'vitest'
import {
  config,
  isEnhancedSummaryLogCheckPagesEnabled,
  isLocalEnvironment,
  isProductionEnvironment
} from './config.js'

describe('#config', () => {
  describe(isEnhancedSummaryLogCheckPagesEnabled, () => {
    afterEach(() => {
      config.reset('featureFlags.enhancedSummaryLogCheckPages')
    })

    it('should return false by default', () => {
      expect(isEnhancedSummaryLogCheckPagesEnabled()).toBe(false)
    })

    it('should return true when flag is enabled', () => {
      config.set('featureFlags.enhancedSummaryLogCheckPages', true)
      expect(isEnhancedSummaryLogCheckPagesEnabled()).toBe(true)
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

  describe(isLocalEnvironment, () => {
    afterEach(() => {
      config.reset('cdpEnvironment')
    })

    it('should return true when cdpEnvironment is local', () => {
      config.set('cdpEnvironment', 'local')

      expect(isLocalEnvironment()).toBe(true)
    })

    it.each([
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ])('should return false when cdpEnvironment is %s', (env) => {
      config.set('cdpEnvironment', env)

      expect(isLocalEnvironment()).toBe(false)
    })
  })
})
