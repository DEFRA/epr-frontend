import { describe, expect, it } from 'vitest'
import { getDisplayMaterial } from './get-display-material.js'

describe(getDisplayMaterial, () => {
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

        expect(
          getDisplayMaterial(
            /** @type {Parameters<typeof getDisplayMaterial>[0]} */ (
              registration
            )
          )
        ).toBe(expectedDisplay)
      }
    )
  })

  describe('non-glass materials', () => {
    it.each([
      ['aluminium', 'Aluminium'],
      ['fibre', 'Fibre-based composite'],
      ['paper', 'Paper and board'],
      ['plastic', 'Plastic'],
      ['steel', 'Steel'],
      ['wood', 'Wood']
    ])('should return "%s" as "%s"', (material, expectedDisplay) => {
      const registration = { material }

      expect(
        getDisplayMaterial(
          /** @type {Parameters<typeof getDisplayMaterial>[0]} */ (registration)
        )
      ).toBe(expectedDisplay)
    })
  })

  describe('invalid registrations', () => {
    it.each([
      [
        'material is unknown',
        { material: 'unknown' },
        {
          message: 'Unknown material: unknown',
          code: 'unknown_material',
          event: { action: 'lookup_material', reason: 'material=unknown' }
        }
      ],
      [
        'glassRecyclingProcess is missing',
        { material: 'glass' },
        {
          message: 'Missing glassRecyclingProcess for glass material',
          code: 'glass_recycling_process_missing',
          event: { action: 'lookup_material', reason: 'material=glass' }
        }
      ],
      [
        'glassRecyclingProcess value is unknown',
        { material: 'glass', glassRecyclingProcess: ['glass_invalid'] },
        {
          message: 'Unknown glassRecyclingProcess: glass_invalid',
          code: 'glass_recycling_process_unknown',
          event: {
            action: 'lookup_material',
            reason: 'glassRecyclingProcess=glass_invalid'
          }
        }
      ]
    ])('should throw when %s', (_label, registration, expected) => {
      expect(() =>
        getDisplayMaterial(
          /** @type {Parameters<typeof getDisplayMaterial>[0]} */ (registration)
        )
      ).toThrow(expect.objectContaining({ isBoom: true, ...expected }))
    })
  })
})
