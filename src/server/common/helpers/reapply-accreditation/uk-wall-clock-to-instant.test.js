import { describe, expect, test } from 'vitest'
import { ukWallClockToInstant } from '#server/common/helpers/reapply-accreditation/uk-wall-clock-to-instant.js'

describe('#ukWallClockToInstant', () => {
  test('resolves a BST wall-clock time (1 September) to UTC-1 hour', () => {
    const instant = ukWallClockToInstant({
      year: 2026,
      month: 9,
      day: 1,
      time: '09:00'
    })

    expect(instant.toISOString()).toBe('2026-09-01T08:00:00.000Z')
  })

  test('resolves a GMT wall-clock time (31 December) to UTC with no offset', () => {
    const instant = ukWallClockToInstant({
      year: 2026,
      month: 12,
      day: 31,
      time: '23:59'
    })

    expect(instant.toISOString()).toBe('2026-12-31T23:59:00.000Z')
  })

  test('resolves a GMT wall-clock time (January) to UTC with no offset', () => {
    const instant = ukWallClockToInstant({
      year: 2026,
      month: 1,
      day: 15,
      time: '09:00'
    })

    expect(instant.toISOString()).toBe('2026-01-15T09:00:00.000Z')
  })
})
