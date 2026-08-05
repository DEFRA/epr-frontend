import { describe, expect, test } from 'vitest'
import { formatCurrency } from '#server/common/helpers/format-currency.js'

describe('#formatCurrency', () => {
  describe('with defaults', () => {
    test('currency should be in expected format', () => {
      expect(formatCurrency('20000000')).toBe('£20,000,000.00')
    })
  })

  describe('with Currency attributes', () => {
    test('currency should be in provided format', () => {
      expect(formatCurrency('5500000', 'en-US', 'USD')).toBe('$5,500,000.00')
    })
  })

  describe('with missing values', () => {
    test('returns zero currency for null value', () => {
      expect(formatCurrency(null)).toBe('£0.00')
    })

    test('returns zero currency for undefined value', () => {
      expect(formatCurrency(undefined)).toBe('£0.00')
    })
  })
})
