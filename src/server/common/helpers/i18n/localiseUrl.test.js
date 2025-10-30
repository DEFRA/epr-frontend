import { localiseUrl } from './localiseUrl.js'
import { describe, expect, it } from 'vitest'
import { langPrefix } from '#server/common/constants/lang-prefix.js'

const registrationPath = '/organisations'
const englishRegistrationPath = `${registrationPath}`
const welshRegistrationPath = `/cy${registrationPath}`

describe(localiseUrl, () => {
  it('should prefix Welsh URLs with /cy', () => {
    expect(localiseUrl(registrationPath, langPrefix.cy)).toBe(
      welshRegistrationPath
    )
  })

  it('should not prefix English URLs', () => {
    expect(localiseUrl(registrationPath, langPrefix.en)).toBe(
      englishRegistrationPath
    )
  })

  it('should handle paths without leading slash', () => {
    expect(localiseUrl('organisations', langPrefix.cy)).toBe(
      welshRegistrationPath
    )
  })

  it('should return "/" when path is empty or falsy', () => {
    expect(localiseUrl('', langPrefix.en)).toBe('')
    expect(localiseUrl(null, langPrefix.cy)).toBe('/cy')
  })
})
