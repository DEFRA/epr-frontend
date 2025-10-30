import { langPrefix } from '#server/common/constants/lang-prefix.js'
import { describe, expect, it } from 'vitest'
import { localiseUrl } from './localiseUrl.js'

describe(localiseUrl, () => {
  describe('english localisation', () => {
    it.each([
      { path: '', expected: '/' },
      { path: 'organisations/123', expected: '/organisations/123' },
      {
        path: '/organisations/123?tab=details#contact',
        expected: '/organisations/123?tab=details#contact'
      }
    ])('should return $expected when path is $path', ({ path, expected }) => {
      expect(localiseUrl(langPrefix.en)(path)).toBe(expected)
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
      expect(localiseUrl(langPrefix.cy)(path)).toBe(expected)
    })
  })
})
