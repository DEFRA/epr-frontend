import { describe, expect, test } from 'vitest'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

const defaultWindow = { windowStartMonth: 9, windowEndMonth: 12 }

describe('#isWithinReapplyWindow', () => {
  describe('with the default window (September to December)', () => {
    test('returns false in the month before the window opens', () => {
      const now = new Date('2026-08-31T12:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })

    test('returns true at the start of the first month of the window', () => {
      const now = new Date('2026-09-01T00:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns true late in the final month of the window', () => {
      const now = new Date('2026-12-31T23:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns false in the month after the window closes', () => {
      const now = new Date('2027-01-01T00:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })
  })

  describe('with an overridden year-round window', () => {
    test('returns true in January when the window opens in month 1', () => {
      const now = new Date('2026-01-15T09:00:00')
      expect(
        isWithinReapplyWindow(now, { windowStartMonth: 1, windowEndMonth: 12 })
      ).toBe(true)
    })
  })
})
