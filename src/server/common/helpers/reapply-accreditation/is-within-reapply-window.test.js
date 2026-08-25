import { describe, expect, test } from 'vitest'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

const defaultWindow = {
  windowStartMonth: 9,
  windowEndMonth: 12,
  windowStartTime: '09:00'
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
  })

  describe('with an overridden year-round window', () => {
    test('returns true in January when the window opens in month 1 and now is after the opening time', () => {
      const now = new Date('2026-01-15T09:00:00Z')
      expect(
        isWithinReapplyWindow(now, {
          windowStartMonth: 1,
          windowEndMonth: 12,
          windowStartTime: '09:00'
        })
      ).toBe(true)
    })

    test('returns false on day 1 of the start month before the opening time', () => {
      const now = new Date('2026-01-01T07:00:00Z')
      expect(
        isWithinReapplyWindow(now, {
          windowStartMonth: 1,
          windowEndMonth: 12,
          windowStartTime: '09:00'
        })
      ).toBe(false)
    })
  })
})
