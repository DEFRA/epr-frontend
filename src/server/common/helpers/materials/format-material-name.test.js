import { describe, expect, it } from 'vitest'

import { formatMaterialName } from './format-material-name.js'

describe(formatMaterialName, () => {
  it.each([
    ['aluminium', 'Aluminium'],
    ['fibre', 'Fibre'],
    ['glass', 'Glass'],
    ['paper', 'Paper and board'],
    ['plastic', 'Plastic'],
    ['steel', 'Steel'],
    ['wood', 'Wood']
  ])('should format %s as %s', (material, expected) => {
    expect(formatMaterialName(material)).toBe(expected)
  })

  it('should throw Boom.internal for unknown material', () => {
    try {
      formatMaterialName('unknown')
      expect.fail('Expected error to be thrown')
    } catch (error) {
      expect(error).toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
    }
  })
})
