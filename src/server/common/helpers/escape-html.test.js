import { describe, expect, it } from 'vitest'

import { escapeHtml } from './escape-html.js'

describe(escapeHtml, () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('should escape angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('should escape double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('should return plain text unchanged', () => {
    expect(escapeHtml('Quarter 1, 2026')).toBe('Quarter 1, 2026')
  })

  it('should return empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('should return empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })
})
