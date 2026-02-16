import { describe, expect, it, vi } from 'vitest'
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

  it.each([
    {
      redirect: '/path/with\\backslash',
      expected: '/',
      description: 'backslash characters'
    },
    {
      redirect: '/path\u0000with-null',
      expected: '/',
      description: 'control characters'
    },
    {
      redirect: '/path\u007Fwith-del',
      expected: '/',
      description: 'DEL character'
    }
  ])(
    'should return "/" when redirect contains $description',
    ({ redirect, expected }) => {
      expect(getSafeRedirect(redirect)).toBe(expected)
    }
  )

  it('should trim surrounding whitespace in valid redirects', () => {
    expect(getSafeRedirect('   /dashboard   ')).toBe('/dashboard')
  })

  it('should return "/" when parsed URL fails origin validation', () => {
    vi.stubGlobal(
      'URL',
      class MockURL {
        constructor() {
          return {
            origin: 'http://localhost',
            pathname: '//dashboard',
            search: '',
            hash: ''
          }
        }
      }
    )

    expect(getSafeRedirect('/dashboard')).toBe('/')
    vi.unstubAllGlobals()
  })

  it('should return "/" when URL parsing throws', () => {
    vi.stubGlobal(
      'URL',
      class MockURL {
        constructor() {
          throw new TypeError('Invalid URL')
        }
      }
    )

    expect(getSafeRedirect('/dashboard')).toBe('/')
    vi.unstubAllGlobals()
  })
})
