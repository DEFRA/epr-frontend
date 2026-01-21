import { describe, expect, test } from 'vitest'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

describe('#formatTonnage', () => {
  describe('with defaults', () => {
    test('formats whole numbers with thousand separators', () => {
      expect(formatTonnage(1000)).toBe('1,000')
    })

    test('formats decimal numbers with up to 2 decimal places', () => {
      expect(formatTonnage(1234.56)).toBe('1,234.56')
    })

    test('truncates decimals beyond 2 places', () => {
      expect(formatTonnage(1234.5678)).toBe('1,234.57')
    })

    test('formats zero correctly', () => {
      expect(formatTonnage(0)).toBe('0')
    })

    test('returns dash for null value', () => {
      expect(formatTonnage(null)).toBe('-')
    })

    test('returns dash for undefined value', () => {
      expect(formatTonnage(undefined)).toBe('-')
    })
  })

  describe('with locale', () => {
    test('formats with provided locale', () => {
      expect(formatTonnage(1234.56, 'de-DE')).toBe('1.234,56')
    })
  })
})
