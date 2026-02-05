import { describe, expect, it } from 'vitest'
import { getRecoveryCode } from './get-recovery-code.js'

describe('#getRecoveryCode', () => {
  it.each([
    { material: 'aluminium', expected: 'R4' },
    { material: 'fibre', expected: 'R3' },
    { material: 'paper', expected: 'R3' },
    { material: 'plastic', expected: 'R3' },
    { material: 'steel', expected: 'R4' },
    { material: 'wood', expected: 'R3' },
    { material: 'glass', expected: 'R5' }
  ])('should return $expected for $material', ({ material, expected }) => {
    expect(getRecoveryCode(material)).toBe(expected)
  })

  it('should return empty string for unknown material', () => {
    expect(getRecoveryCode('Unknown')).toBe('')
  })
})
