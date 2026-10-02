import { describe, expect, it } from 'vitest'
import {
  getMaterialDisplayName,
  getRegistrationMaterialDisplayName
} from './get-display-material.js'

const asRegistrationInput = (data) =>
  /** @type {Parameters<typeof getRegistrationMaterialDisplayName>[0]} */ (data)

describe(getRegistrationMaterialDisplayName, () => {
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
          getRegistrationMaterialDisplayName(asRegistrationInput(registration))
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
        getRegistrationMaterialDisplayName(asRegistrationInput(registration))
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
        'glassRecyclingProcess names a material rather than a process',
        { material: 'glass', glassRecyclingProcess: ['plastic'] },
        {
          message: 'Unknown glassRecyclingProcess: plastic',
          code: 'glass_recycling_process_unknown',
          event: {
            action: 'lookup_material',
            reason: 'glassRecyclingProcess=plastic'
          }
        }
      ],
      [
        'material names a glass process rather than what was applied for',
        { material: 'glass_re_melt' },
        {
          message: 'Unknown material: glass_re_melt',
          code: 'unknown_material',
          event: { action: 'lookup_material', reason: 'material=glass_re_melt' }
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
        getRegistrationMaterialDisplayName(asRegistrationInput(registration))
      ).toThrow(expect.objectContaining({ isBoom: true, ...expected }))
    })
  })
})

describe(getMaterialDisplayName, () => {
  it.each([
    ['plastic', 'Plastic'],
    ['fibre', 'Fibre-based composite'],
    ['glass_re_melt', 'Glass remelt'],
    ['glass_other', 'Glass other'],
    ['glass', 'Glass']
  ])('names %s as %s', (material, expected) => {
    expect(getMaterialDisplayName(material)).toBe(expected)
  })

  it('keeps the name of a material this app does not know', () => {
    expect(getMaterialDisplayName('cardboard')).toBe('cardboard')
  })
})
