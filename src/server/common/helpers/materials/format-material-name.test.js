import { describe, expect, it } from 'vitest'
import { getDisplayMaterial } from './format-material-name.js'

describe(getDisplayMaterial, () => {
  describe('glass registrations', () => {
    it('should return "Glass remelt" when glassRecyclingProcess is glass_re_melt', () => {
      const registration = {
        material: 'glass',
        glassRecyclingProcess: ['glass_re_melt']
      }

      expect(getDisplayMaterial(registration)).toBe('Glass remelt')
    })

    it('should return "Glass other" when glassRecyclingProcess is glass_other', () => {
      const registration = {
        material: 'glass',
        glassRecyclingProcess: ['glass_other']
      }

      expect(getDisplayMaterial(registration)).toBe('Glass other')
    })
  })

  describe('non-glass materials', () => {
    it.each([
      ['aluminium', 'Aluminium'],
      ['fibre', 'Fibre'],
      ['paper', 'Paper and board'],
      ['plastic', 'Plastic'],
      ['steel', 'Steel'],
      ['wood', 'Wood']
    ])('should return %s as %s', (material, expectedDisplay) => {
      const registration = { material }

      expect(getDisplayMaterial(registration)).toBe(expectedDisplay)
    })
  })

  describe('invalid glass registration states', () => {
    it('should throw when glass registration has null glassRecyclingProcess', () => {
      const registration = {
        material: 'glass',
        glassRecyclingProcess: null
      }

      expect(() => getDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message: 'Glass registration missing glassRecyclingProcess'
        })
      )
    })

    it('should throw when glass registration has undefined glassRecyclingProcess', () => {
      const registration = {
        material: 'glass'
      }

      expect(() => getDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message: 'Glass registration missing glassRecyclingProcess'
        })
      )
    })

    it('should throw when glass registration has empty glassRecyclingProcess array', () => {
      const registration = {
        material: 'glass',
        glassRecyclingProcess: []
      }

      expect(() => getDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message: 'Glass registration missing glassRecyclingProcess'
        })
      )
    })

    it('should throw when glass registration has multiple glassRecyclingProcess values', () => {
      const registration = {
        material: 'glass',
        glassRecyclingProcess: ['glass_re_melt', 'glass_other']
      }

      expect(() => getDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message:
            'Glass registration has multiple glassRecyclingProcess values'
        })
      )
    })

    it('should throw when glass registration has unrecognised glassRecyclingProcess value', () => {
      const registration = {
        material: 'glass',
        glassRecyclingProcess: ['glass_unknown']
      }

      expect(() => getDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message:
            'Glass registration has invalid glassRecyclingProcess: glass_unknown'
        })
      )
    })
  })

  describe('unknown material', () => {
    it('should throw for unknown material', () => {
      const registration = { material: 'unknown' }

      expect(() => getDisplayMaterial(registration)).toThrowError(
        expect.objectContaining({
          isBoom: true,
          message: 'Unknown material: unknown'
        })
      )
    })
  })
})
