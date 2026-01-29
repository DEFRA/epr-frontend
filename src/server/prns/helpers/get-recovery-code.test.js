import { describe, expect, it } from 'vitest'
import { getRecoveryCode } from './get-recovery-code.js'

describe('#getRecoveryCode', () => {
  it.each([
    { material: 'Aluminium', expected: 'R4' },
    { material: 'Paper and Board', expected: 'R3' },
    { material: 'Fibre-based Composite', expected: 'R3' },
    { material: 'Plastic', expected: 'R3' },
    { material: 'Steel', expected: 'R4' },
    { material: 'Wood', expected: 'R3' },
    { material: 'Glass', expected: 'R5' }
  ])('should return $expected for $material', ({ material, expected }) => {
    expect(getRecoveryCode(material)).toBe(expected)
  })

  it('should return empty string for unknown material', () => {
    expect(getRecoveryCode('Unknown')).toBe('')
  })
})
