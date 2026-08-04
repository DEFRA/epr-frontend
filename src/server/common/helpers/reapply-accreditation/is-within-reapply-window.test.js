import { describe, expect, test } from 'vitest'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

const defaultWindow = { windowStart: '09-01', windowEnd: '12-31' }

describe('#isWithinReapplyWindow', () => {
  describe('with the default window (1 September to 31 December)', () => {
    test('returns false the day before the window opens', () => {
      const now = new Date('2026-08-31T12:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })

    test('returns true at the start of the day the window opens', () => {
      const now = new Date('2026-09-01T00:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns true late on the final day of the window', () => {
      const now = new Date('2026-12-31T23:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(true)
    })

    test('returns false the day after the window closes', () => {
      const now = new Date('2027-01-01T00:00:00')
      expect(isWithinReapplyWindow(now, defaultWindow)).toBe(false)
    })
  })

  describe('with an overridden year-round window', () => {
    test('returns true in January when the window opens on 1 January', () => {
      const now = new Date('2026-01-15T09:00:00')
      expect(
        isWithinReapplyWindow(now, { windowStart: '01-01', windowEnd: '12-31' })
      ).toBe(true)
    })
  })
})
