import { describe, expect, it } from 'vitest'

import { orDash } from './format-or-dash.js'

describe(orDash, () => {
  const identity = orDash((value) => `${value}`)
  const tonnes = orDash((value) => `${value} t`)

  it('should return a dash for null', () => {
    expect(identity(null)).toBe('-')
  })

  it('should return a dash for undefined', () => {
    expect(identity(undefined)).toBe('-')
  })

  it('should format a present value', () => {
    expect(tonnes(5)).toBe('5 t')
  })

  it('should format zero rather than dashing it', () => {
    expect(tonnes(0)).toBe('0 t')
  })
})
