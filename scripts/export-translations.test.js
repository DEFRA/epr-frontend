import { describe, it, expect } from 'vitest'
import { parseArgs } from './export-translations.js'

describe(parseArgs, () => {
  it('should parse --out argument', () => {
    const result = parseArgs(['--out', 'custom/path.xlsx'])

    expect(result).toBe('custom/path.xlsx')
  })

  it('should default to translations.xlsx when --out is missing or empty', () => {
    expect(parseArgs([])).toBe('translations.xlsx')
    expect(parseArgs(['--out'])).toBe('translations.xlsx')
  })
})
