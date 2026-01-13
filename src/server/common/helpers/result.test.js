import assert from 'node:assert'
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

    test('should throw AssertionError when value is null', () => {
      expect(() => ok(null)).toThrowError(assert.AssertionError)
    })

    test('should throw AssertionError when value is undefined', () => {
      expect(() => ok(undefined)).toThrowError(assert.AssertionError)
    })
  })

  describe('err()', () => {
    test('should create error result without error field when no error provided', () => {
      const result = err()

      expect(result).toStrictEqual({
        ok: false
      })
    })

    test('should create error result without error field when error is null', () => {
      const result = err(null)

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
