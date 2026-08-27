import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  assertValidReapplyBaseUrl,
  assertValidReapplyWindow,
  assertValidReapplyWindowBound,
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
        assertValidReapplyWindow({
          windowStart: '09-01T09:00',
          windowEnd: '12-31T23:59'
        })
      ).not.toThrow()
    })

    it('should accept a window whose start and end are the same instant', () => {
      expect(() =>
        assertValidReapplyWindow({
          windowStart: '09-01T09:00',
          windowEnd: '09-01T09:00'
        })
      ).not.toThrow()
    })

    it('should throw when the start is after the end', () => {
      expect(() =>
        assertValidReapplyWindow({
          windowStart: '12-01T00:00',
          windowEnd: '02-01T00:00'
        })
      ).toThrow(/must not be after/)
    })
  })

  describe(assertValidReapplyWindowBound, () => {
    it.each(['09-01T09:00', '01-01T00:00', '12-31T23:59'])(
      'should accept a valid MM-DDTHH:mm bound "%s"',
      (value) => {
        expect(() => assertValidReapplyWindowBound(value)).not.toThrow()
      }
    )

    describe('29 February (depends on the current year being a leap year)', () => {
      afterEach(() => {
        vi.useRealTimers()
      })

      it('accepts 02-29 when the current year is a leap year', () => {
        vi.setSystemTime(new Date('2028-06-01'))
        expect(() => assertValidReapplyWindowBound('02-29T00:00')).not.toThrow()
      })

      it('rejects 02-29 when the current year is not a leap year', () => {
        vi.setSystemTime(new Date('2026-06-01'))
        expect(() => assertValidReapplyWindowBound('02-29T00:00')).toThrow(
          /must name a real UK date/
        )
      })
    })

    it.each([
      '9-01T09:00',
      '09-1T09:00',
      '09-01T9:00',
      '09-01 09:00',
      '09-01T24:00',
      '09-01T09:60',
      'abc',
      ''
    ])('should throw for a malformed bound "%s"', (value) => {
      expect(() => assertValidReapplyWindowBound(value)).toThrow(
        /must be MM-DDTHH:mm/
      )
    })

    it.each([
      '13-01T09:00',
      '00-01T09:00',
      '09-31T09:00',
      '02-30T00:00',
      '04-31T00:00'
    ])(
      'should throw for a bound naming a date that does not exist "%s"',
      (value) => {
        expect(() => assertValidReapplyWindowBound(value)).toThrow(
          /must name a real UK date/
        )
      }
    )
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
