import { describe, expect, it } from 'vitest'
import { MATERIAL } from '#domain/materials.js'
import { getRecoveryCode } from './get-recovery-code.js'

/** @import { Material } from '#domain/materials.js' */

describe('#getRecoveryCode', () => {
  it.each([
    { material: MATERIAL.ALUMINIUM, expected: 'R4' },
    { material: MATERIAL.FIBRE, expected: 'R3' },
    { material: MATERIAL.PAPER, expected: 'R3' },
    { material: MATERIAL.PLASTIC, expected: 'R3' },
    { material: MATERIAL.STEEL, expected: 'R4' },
    { material: MATERIAL.WOOD, expected: 'R3' },
    { material: MATERIAL.GLASS, expected: 'R5' }
  ])('should return $expected for $material', ({ material, expected }) => {
    expect(getRecoveryCode(material)).toBe(expected)
  })

  it('should return empty string for a material outside the enum', () => {
    const unknown = /** @type {Material} */ (/** @type {unknown} */ ('Unknown'))

    expect(getRecoveryCode(unknown)).toBe('')
  })
})
