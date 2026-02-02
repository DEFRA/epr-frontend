import { describe, expect, it } from 'vitest'

import { formatDateForDisplay } from './format-date-for-display.js'

describe(formatDateForDisplay, () => {
  it('formats ISO date string to UK format', () => {
    const result = formatDateForDisplay('2026-01-16T14:30:00.000Z')
    expect(result).toBe('16 January 2026')
  })

  it('formats date without time component', () => {
    const result = formatDateForDisplay('2025-12-25')
    expect(result).toBe('25 December 2025')
  })
})
