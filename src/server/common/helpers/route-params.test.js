import { describe, expect, it } from 'vitest'

import { yearParam } from './route-params.js'

describe('route params', () => {
  describe('a {year} segment', () => {
    it.each(['2024', '2026', '2100'])(
      'should read the year segment %s as a year',
      (segment) => {
        expect(yearParam.validate(segment)).toStrictEqual({
          value: Number(segment)
        })
      }
    )

    it.each([
      { segment: '2023', description: 'before the first year' },
      { segment: '2101', description: 'after the last year' },
      { segment: '26', description: 'not four digits' },
      { segment: '02026', description: 'zero-padded' },
      { segment: '2026.0', description: 'a decimal' },
      { segment: '+2026', description: 'signed' },
      { segment: 'abcd', description: 'not a number' }
    ])('should reject a segment $description', ({ segment }) => {
      expect(yearParam.validate(segment).error).toBeDefined()
    })
  })
})
