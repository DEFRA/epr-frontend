import { describe, expect, test } from 'vitest'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

describe('#formatTonnage', () => {
  describe('with defaults', () => {
    test('formats whole numbers with thousand separators and 2 decimal places', () => {
      expect(formatTonnage(1000)).toBe('1,000.00')
    })

    test('formats decimal numbers with up to 2 decimal places', () => {
      expect(formatTonnage(1234.56)).toBe('1,234.56')
    })

    test('truncates decimals beyond 2 places', () => {
      expect(formatTonnage(1234.5678)).toBe('1,234.57')
    })

    test('formats zero correctly', () => {
      expect(formatTonnage(0)).toBe('0.00')
    })

    test('returns 0.00 for null value', () => {
      expect(formatTonnage(null)).toBe('0.00')
    })

    test('returns 0.00 for undefined value', () => {
      expect(formatTonnage(undefined)).toBe('0.00')
    })
  })

  describe('with locale', () => {
    test('formats with provided locale', () => {
      expect(formatTonnage(1234.56, 'de-DE')).toBe('1.234,56')
    })
  })
})
