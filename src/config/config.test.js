import { afterEach, describe, it, expect } from 'vitest'
import {
  assertValidReapplyWindow,
  config,
  isLocalEnvironment,
  isProductionEnvironment
} from './config.js'

describe('#config', () => {
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

  describe(assertValidReapplyWindow, () => {
    it('should accept a valid non-wrapping window', () => {
      expect(() =>
        assertValidReapplyWindow({ windowStart: '09-01', windowEnd: '12-31' })
      ).not.toThrow()
    })

    it.each(['13-01', '00-05', '01-32', '1-01', '2026-09-01', 'nonsense'])(
      'should throw for a malformed windowStart "%s"',
      (windowStart) => {
        expect(() =>
          assertValidReapplyWindow({ windowStart, windowEnd: '12-31' })
        ).toThrow(/MM-DD/)
      }
    )

    it('should throw for a malformed windowEnd', () => {
      expect(() =>
        assertValidReapplyWindow({ windowStart: '09-01', windowEnd: 'bad' })
      ).toThrow(/windowEnd/)
    })

    it('should throw when the window wraps the year end', () => {
      expect(() =>
        assertValidReapplyWindow({ windowStart: '12-01', windowEnd: '02-28' })
      ).toThrow(/must not be after/)
    })
  })
})
