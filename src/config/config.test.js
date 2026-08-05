import { afterEach, describe, it, expect } from 'vitest'
import {
  assertValidReapplyBaseUrl,
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
        assertValidReapplyWindow({ windowStartMonth: 9, windowEndMonth: 12 })
      ).not.toThrow()
    })

    it.each([0, 13, -1])(
      'should throw for an out-of-range windowStartMonth "%s"',
      (windowStartMonth) => {
        expect(() =>
          assertValidReapplyWindow({ windowStartMonth, windowEndMonth: 12 })
        ).toThrow(/windowStartMonth must be a month between 1 and 12/)
      }
    )

    it('should throw for an out-of-range windowEndMonth', () => {
      expect(() =>
        assertValidReapplyWindow({ windowStartMonth: 9, windowEndMonth: 13 })
      ).toThrow(/windowEndMonth must be a month between 1 and 12/)
    })

    it('should throw when the start month is after the end month', () => {
      expect(() =>
        assertValidReapplyWindow({ windowStartMonth: 12, windowEndMonth: 2 })
      ).toThrow(/must not be after/)
    })
  })

  describe(assertValidReapplyBaseUrl, () => {
    it('should accept an empty value (feature off)', () => {
      expect(() => assertValidReapplyBaseUrl('')).not.toThrow()
    })

    it('should accept a valid https URL', () => {
      expect(() =>
        assertValidReapplyBaseUrl('https://ws2.example')
      ).not.toThrow()
    })

    it('should throw for a value that is not a URL', () => {
      expect(() => assertValidReapplyBaseUrl('not a url')).toThrow(
        /must be empty or a valid URL/
      )
    })

    it('should throw for a non-http(s) URL', () => {
      expect(() => assertValidReapplyBaseUrl('ftp://ws2.example')).toThrow(
        /must be an http\(s\) URL/
      )
    })
  })
})
