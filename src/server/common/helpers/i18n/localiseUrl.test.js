import { localiseUrl } from './localiseUrl.js'
import { languages } from '#server/common/constants/language-codes.js'
import { describe, expect, it } from 'vitest'

const englishRegistrationPath = '/organisations'
const welshRegistrationPath = '/cy/organisations'

describe(localiseUrl, () => {
  it('should prefix Welsh URLs with /cy', () => {
    expect(localiseUrl(englishRegistrationPath, languages.WELSH)).toBe(
      welshRegistrationPath
    )
  })

  it('should not prefix English URLs', () => {
    expect(localiseUrl(englishRegistrationPath, languages.ENGLISH)).toBe(
      englishRegistrationPath
    )
  })

  it('should handle paths without leading slash', () => {
    expect(localiseUrl('organisations', languages.WELSH)).toBe(
      welshRegistrationPath
    )
  })

  it('should return "/" when path is empty or falsy', () => {
    expect(localiseUrl('', languages.ENGLISH)).toBe('/')
    expect(localiseUrl(null, languages.WELSH)).toBe('/')
  })

  it('should not double-prefix if path already starts with /cy/', () => {
    expect(localiseUrl(welshRegistrationPath, languages.WELSH)).toBe(
      welshRegistrationPath
    )
  })
})
