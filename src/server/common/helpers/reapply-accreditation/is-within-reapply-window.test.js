import { describe, expect, test } from 'vitest'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

const defaultWindow = {
  windowStart: '09-01T09:00',
  windowEnd: '12-31T23:59'
}

describe('#isWithinReapplyWindow', () => {
  describe('with the default window (September to December, opening at 09:00 UK time)', () => {
    test('returns false in the month before the window opens', () => {
      const now = new Date('2026-08-31T12:00:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })

    test('returns false before the opening time on day 1 of the start month', () => {
      const now = new Date('2026-09-01T07:59:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })

    test('returns true exactly at the opening time on day 1 of the start month', () => {
      const now = new Date('2026-09-01T08:00:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns true just after the opening time on day 1 of the start month', () => {
      const now = new Date('2026-09-01T08:01:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns true for the whole of the second day of the start month', () => {
      const now = new Date('2026-09-02T00:00:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns true late in the final month of the window', () => {
      const now = new Date('2026-12-31T23:00:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns false in the month after the window closes', () => {
      const now = new Date('2027-01-01T00:00:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })

    test('crosses into the next UK day before UTC does (BST): still 31 Aug UTC is already 1 Sep UK', () => {
      const now = new Date('2026-08-31T23:30:00Z')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })
  })

  describe('with an overridden year-round window', () => {
    test('returns true in January when the window opens in month 1 and now is after the opening time', () => {
      const now = new Date('2026-01-15T09:00:00Z')
      expect(
        isWithinReapplyWindow(now, {
          windowStart: '01-01T09:00',
          windowEnd: '12-31T23:59'
        })
      ).toBe(true)
    })

    test('returns false on day 1 of the start month before the opening time', () => {
      const now = new Date('2026-01-01T07:00:00Z')
      expect(
        isWithinReapplyWindow(now, {
          windowStart: '01-01T09:00',
          windowEnd: '12-31T23:59'
        })
      ).toBe(false)
    })
  })

  describe('with a window that closes at a configured time (not just whole-month)', () => {
    const window = { windowStart: '09-01T09:00', windowEnd: '12-31T18:00' }

    test('returns true just before the closing time', () => {
      const now = new Date('2026-12-31T17:59:00Z')
      expect(isWithinReapplyWindow(now, window)).toBe(true)
    })

    test('returns false just after the closing time', () => {
      const now = new Date('2026-12-31T18:01:00Z')
      expect(isWithinReapplyWindow(now, window)).toBe(false)
    })
  })

  describe('with a window that closes in a BST month (both bounds resolved in one timezone)', () => {
    const window = { windowStart: '03-01T09:00', windowEnd: '06-30T23:59' }

    test('returns true just before UK 23:59 on the closing day (22:58 UTC, BST)', () => {
      const now = new Date('2026-06-30T22:58:00Z')
      expect(isWithinReapplyWindow(now, window)).toBe(true)
    })

    test('returns false just after UK midnight on the day after closing (23:30 UTC, already 1 Jul UK)', () => {
      const now = new Date('2026-06-30T23:30:00Z')
      expect(isWithinReapplyWindow(now, window)).toBe(false)
    })
  })

  describe('at a New Year boundary', () => {
    test('a window starting 1 January opens exactly at the UK new year, not the runtime-zone one', () => {
      const now = new Date('2027-01-01T00:30:00Z')
      expect(
        isWithinReapplyWindow(now, {
          windowStart: '01-01T00:00',
          windowEnd: '12-31T23:59'
        })
      ).toBe(true)
    })
  })
})
