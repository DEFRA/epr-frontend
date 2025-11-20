import { config } from '#config/config.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { localiseUrl } from './localiseUrl.js'

describe(localiseUrl, () => {
  beforeAll(() => {
    config.set('appBaseUrl', 'https://required-for-url.ctor')
  })

  afterAll(() => {
    config.reset('appBaseUrl')
  })

  describe('english localisation', () => {
    it.each([
      { path: '', expected: '/' },
      { path: 'organisations/123', expected: '/organisations/123' },
      {
        path: '/organisations/123?tab=details#contact',
        expected: '/organisations/123?tab=details#contact'
      }
    ])('should return $expected when path is $path', ({ path, expected }) => {
      expect(localiseUrl('en')(path)).toBe(expected)
    })
  })

  describe('welsh localisation', () => {
    it.each([
      { path: '', expected: '/cy' },
      { path: 'organisations/123', expected: '/cy/organisations/123' },
      {
        path: '/organisations/123?tab=details#contact',
        expected: '/cy/organisations/123?tab=details#contact'
      }
    ])('should return $expected when path is $path', ({ path, expected }) => {
      expect(localiseUrl('cy')(path)).toBe(expected)
    })
  })

  describe('unsupported language', () => {
    it.each([
      { path: '', expected: '/' },
      { path: 'organisations/123', expected: '/organisations/123' },
      {
        path: '/organisations/123?tab=details#contact',
        expected: '/organisations/123?tab=details#contact'
      }
    ])('should return $expected when path is $path', ({ path, expected }) => {
      expect(localiseUrl('fr')(path)).toBe(expected)
    })
  })
})
