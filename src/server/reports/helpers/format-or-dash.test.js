import { describe, expect, it } from 'vitest'

import { orDash } from './format-or-dash.js'

describe(orDash, () => {
  it('should return a dash for null', () => {
    expect(orDash(null, (value) => `${value}`)).toBe('-')
  })

  it('should return a dash for undefined', () => {
    expect(orDash(undefined, (value) => `${value}`)).toBe('-')
  })

  it('should format a present value', () => {
    expect(orDash(5, (value) => `${value} t`)).toBe('5 t')
  })

  it('should format zero rather than dashing it', () => {
    expect(orDash(0, (value) => `${value} t`)).toBe('0 t')
  })
})
