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

  it('should return empty string for undefined material', () => {
    expect(formatMaterialName(undefined)).toBe('')
  })

  it('should return empty string for null material', () => {
    expect(formatMaterialName(null)).toBe('')
  })

  it('should return empty string for empty string material', () => {
    expect(formatMaterialName('')).toBe('')
  })

  it('should throw for unknown material', () => {
    expect(() => formatMaterialName('unknown')).toThrow(
      'Unknown material: unknown'
    )
  })
})
