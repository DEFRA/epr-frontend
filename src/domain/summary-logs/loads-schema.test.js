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

  describe('loadsByReportingPeriod', () => {
    // Mirrors the backend loadsByReportingPeriod contract: both periods, both
    // change types, and both buckets, with a negative tonnageDelta to represent
    // an adjustment that reduces the waste balance.
    const loadsByReportingPeriod = {
      openPeriodLoads: {
        added: {
          balanceAffecting: { count: 5, tonnageDelta: 10 },
          nonBalanceAffecting: { count: 2 }
        },
        adjusted: {
          balanceAffecting: { count: 3, tonnageDelta: 6 },
          nonBalanceAffecting: { count: 1 }
        }
      },
      closedPeriodLoads: {
        added: {
          balanceAffecting: { count: 4, tonnageDelta: 8 },
          nonBalanceAffecting: { count: 0 }
        },
        adjusted: {
          balanceAffecting: { count: 2, tonnageDelta: -4 },
          nonBalanceAffecting: { count: 1 }
        }
      }
    }

    it('should accept a realistic payload and preserve it intact when stripping unknown keys', () => {
      const { error, value } = summaryLogStatusResponseSchema.validate(
        { status: 'validated', loadsByReportingPeriod },
        { stripUnknown: true }
      )

      expect(error).toBeUndefined()
      // Guards against the field being dropped on the floor: before it was added
      // to the schema, stripUnknown would have removed it from the response.
      expect(value.loadsByReportingPeriod).toStrictEqual(loadsByReportingPeriod)
    })

    it('should reject a payload missing a required bucket', () => {
      const { error } = summaryLogStatusResponseSchema.validate({
        status: 'validated',
        loadsByReportingPeriod: {
          ...loadsByReportingPeriod,
          openPeriodLoads: {
            added: { balanceAffecting: { count: 5, tonnageDelta: 10 } },
            adjusted: loadsByReportingPeriod.openPeriodLoads.adjusted
          }
        }
      })

      expect(error?.message).toContain('nonBalanceAffecting')
    })

    it('should reject a balance-affecting bucket missing its tonnageDelta', () => {
      const { error } = summaryLogStatusResponseSchema.validate({
        status: 'validated',
        loadsByReportingPeriod: {
          ...loadsByReportingPeriod,
          openPeriodLoads: {
            added: {
              balanceAffecting: { count: 5 },
              nonBalanceAffecting: { count: 2 }
            },
            adjusted: loadsByReportingPeriod.openPeriodLoads.adjusted
          }
        }
      })

      expect(error?.message).toContain('tonnageDelta')
    })
  })
})
