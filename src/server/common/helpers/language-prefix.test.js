import {
  isWelshPath,
  withoutLanguagePrefix
} from '#server/common/helpers/language-prefix.js'
import { describe, expect, it } from 'vitest'

describe('#language prefix', () => {
  describe(isWelshPath, () => {
    it.each([
      ['the welsh root', '/cy', true],
      ['a welsh page', '/cy/cookies', true],
      ['the english root', '/', false],
      ['an english page', '/cookies', false],
      ['a page whose name merely starts with the prefix', '/cymru', false]
    ])('should recognise %s', (_, path, expected) => {
      expect(isWelshPath(path)).toBe(expected)
    })
  })

  describe(withoutLanguagePrefix, () => {
    it.each([
      ['a welsh page', '/cy/cookies', '/cookies'],
      ['the welsh root', '/cy', '/'],
      ['an english page', '/cookies', '/cookies'],
      ['a page whose name merely starts with the prefix', '/cymru', '/cymru']
    ])('should route %s as its english self', (_, path, expected) => {
      expect(withoutLanguagePrefix(path)).toBe(expected)
    })
  })
})
