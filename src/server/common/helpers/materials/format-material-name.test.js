import { describe, expect, it } from 'vitest'

import { formatMaterialName } from './format-material-name.js'

describe('formatMaterialName', () => {
  it('should return "Paper and board" for paper material', () => {
    expect(formatMaterialName('paper')).toBe('Paper and board')
  })

  it('should capitalise other materials', () => {
    expect(formatMaterialName('aluminium')).toBe('Aluminium')
    expect(formatMaterialName('plastic')).toBe('Plastic')
    expect(formatMaterialName('glass')).toBe('Glass')
    expect(formatMaterialName('steel')).toBe('Steel')
    expect(formatMaterialName('wood')).toBe('Wood')
    expect(formatMaterialName('fibre')).toBe('Fibre')
  })

  it('should handle undefined material', () => {
    expect(formatMaterialName(undefined)).toBe('')
  })

  it('should handle null material', () => {
    expect(formatMaterialName(null)).toBe('')
  })

  it('should handle empty string material', () => {
    expect(formatMaterialName('')).toBe('')
  })
})
