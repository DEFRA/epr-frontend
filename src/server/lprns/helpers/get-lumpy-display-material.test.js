import { describe, expect, it } from 'vitest'
import { getLumpyDisplayMaterial } from './get-lumpy-display-material.js'

describe(getLumpyDisplayMaterial, () => {
  describe('glass registrations', () => {
    it.each([
      ['glass_re_melt', 'Glass remelt'],
      ['glass_other', 'Glass other']
    ])(
      'should return "%s" as "%s"',
      (glassRecyclingProcess, expectedDisplay) => {
        const registration = {
          material: 'glass',
          glassRecyclingProcess: [glassRecyclingProcess]
        }

        expect(getLumpyDisplayMaterial(registration)).toBe(expectedDisplay)
      }
    )
  })

  describe('non-glass materials', () => {
    it.each([
      ['aluminium', 'Aluminium'],
      ['fibre', 'Fibre based composite'],
      ['paper', 'Paper and board'],
      ['plastic', 'Plastic'],
      ['steel', 'Steel'],
      ['wood', 'Wood']
    ])('should return "%s" as "%s"', (material, expectedDisplay) => {
      const registration = { material }

      expect(getLumpyDisplayMaterial(registration)).toBe(expectedDisplay)
    })
  })

  describe('unknown material', () => {
    it('should throw for unknown material', () => {
      const registration = { material: 'unknown' }

      expect(() => getLumpyDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message: 'Unknown material: unknown'
        })
      )
    })
  })
})
