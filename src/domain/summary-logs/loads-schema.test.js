import { describe, expect, it } from 'vitest'

import { loadCategorySchema } from './loads-schema.js'

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
