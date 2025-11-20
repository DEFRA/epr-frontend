import { describe, expect, it } from 'vitest'
import { getSafeRedirect } from './get-safe-redirect.js'

describe(getSafeRedirect, () => {
  it.each([
    { redirect: null, expected: '/', description: 'null' },
    { redirect: undefined, expected: '/', description: 'undefined' },
    { redirect: '', expected: '/', description: 'empty string' },
    {
      redirect: 'https://evil.com',
      expected: '/',
      description: 'absolute URL'
    },
    {
      redirect: '//evil.com',
      expected: '/',
      description: 'protocol-relative URL'
    },
    {
      redirect: 'evil.com',
      expected: '/',
      description: 'domain without protocol'
    }
  ])(
    'should return "/" when redirect is $description',
    ({ redirect, expected }) => {
      expect(getSafeRedirect(redirect)).toBe(expected)
    }
  )

  it.each([
    { redirect: '/dashboard', expected: '/dashboard' },
    { redirect: '/account/settings', expected: '/account/settings' },
    { redirect: '/search?q=test', expected: '/search?q=test' },
    { redirect: '/path#anchor', expected: '/path#anchor' }
  ])(
    'should return "$expected" for safe redirect "$redirect"',
    ({ redirect, expected }) => {
      expect(getSafeRedirect(redirect)).toBe(expected)
    }
  )
})
