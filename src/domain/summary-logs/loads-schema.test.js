import { describe, expect, it } from 'vitest'

import {
  loadCategorySchema,
  summaryLogStatusResponseSchema
} from './loads-schema.js'

describe('loadCategorySchema validation', () => {
  describe('rowIds', () => {
    it('should accept numeric string row-ids', () => {
      const { error } = loadCategorySchema.validate({
        count: 2,
        rowIds: ['1001', '099']
      })

      expect(error).toBeUndefined()
    })

    it('should reject a non-numeric row-id with a numeric-pattern error', () => {
      const { error } = loadCategorySchema.validate({
        count: 1,
        rowIds: ['12a']
      })

      expect(error?.message).toContain('numeric pattern')
    })

    it('should reject a row-id that is not a string', () => {
      const { error } = loadCategorySchema.validate({
        count: 1,
        rowIds: [1001]
      })

      expect(error?.message).toContain('must be a string')
    })
  })
})

describe('summaryLogStatusResponseSchema validation', () => {
  describe('validation.failures location.rowId', () => {
    const failureWith = (location) => ({
      status: 'invalid',
      validation: {
        failures: [{ errorCode: 'MUST_BE_A_NUMBER', location }],
        counts: { fatal: 0, error: 1, warning: 0, total: 1 }
      }
    })

    it('should accept a numeric string row-id', () => {
      const { error } = summaryLogStatusResponseSchema.validate(
        failureWith({ table: 'RECEIVED_LOADS_FOR_REPROCESSING', rowId: '1001' })
      )

      expect(error).toBeUndefined()
    })

    it('should reject a non-numeric row-id with a numeric-pattern error', () => {
      const { error } = summaryLogStatusResponseSchema.validate(
        failureWith({ rowId: '12a' })
      )

      expect(error?.message).toContain('numeric pattern')
    })

    it('should preserve unknown location keys when stripping unknown keys', () => {
      const { value } = summaryLogStatusResponseSchema.validate(
        failureWith({
          sheet: 'Reprocessing',
          table: 'RECEIVED_LOADS_FOR_REPROCESSING',
          row: 8,
          rowId: '1001',
          column: 'D',
          header: 'NET_WEIGHT'
        }),
        { stripUnknown: true }
      )

      expect(value.validation.failures[0].location).toStrictEqual({
        sheet: 'Reprocessing',
        table: 'RECEIVED_LOADS_FOR_REPROCESSING',
        row: 8,
        rowId: '1001',
        column: 'D',
        header: 'NET_WEIGHT'
      })
    })
  })
})
