import { err, ok } from '#server/common/helpers/result.js'
import { describe, expect, test } from 'vitest'

describe('result type', () => {
  describe('ok()', () => {
    test('should create success result with value', () => {
      const result = ok({ id: '123', name: 'Test' })

      expect(result).toStrictEqual({
        ok: true,
        value: { id: '123', name: 'Test' }
      })
    })

    test('should create success result with null value', () => {
      const result = ok(null)

      expect(result).toStrictEqual({
        ok: true,
        value: null
      })
    })
  })

  describe('err()', () => {
    test('should create error result without error field when no error provided', () => {
      const result = err()

      expect(result).toStrictEqual({
        ok: false
      })
    })

    test('should create error result with error field when error provided', () => {
      const result = err('Something went wrong')

      expect(result).toStrictEqual({
        ok: false,
        error: 'Something went wrong'
      })
    })

    test('should create error result with object error', () => {
      const result = err({ code: 'NOT_FOUND', message: 'User not found' })

      expect(result).toStrictEqual({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      })
    })
  })
})
