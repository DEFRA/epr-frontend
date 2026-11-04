import { describe, expect, it } from 'vitest'
import { getMaterialDisplayName } from './get-display-material.js'

describe(getMaterialDisplayName, () => {
  it.each([
    ['aluminium', 'Aluminium'],
    ['fibre', 'Fibre-based composite'],
    ['glass', 'Glass'],
    ['glass_re_melt', 'Glass remelt'],
    ['glass_other', 'Glass other'],
    ['paper', 'Paper and board'],
    ['plastic', 'Plastic'],
    ['steel', 'Steel'],
    ['wood', 'Wood']
  ])('names %s as %s', (material, expected) => {
    expect(getMaterialDisplayName(material)).toBe(expected)
  })

  it('keeps the name of a material this app does not know', () => {
    expect(getMaterialDisplayName('cardboard')).toBe('cardboard')
  })
})
