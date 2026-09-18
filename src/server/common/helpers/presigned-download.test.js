import { describe, expect, it } from 'vitest'

import {
  isAllowedDownloadUrl,
  signedDisposition
} from './presigned-download.js'

describe(isAllowedDownloadUrl, () => {
  it.each([
    'https://re-ex-files.s3.eu-west-2.amazonaws.com/uploads/f.xlsx',
    'https://s3.eu-west-2.amazonaws.com/re-ex-files/f.xlsx',
    'https://re-ex-files.s3.amazonaws.com/f.xlsx',
    'http://localhost:4566/re-ex-files/f.xlsx',
    'http://floci:4566/re-ex-files/f.xlsx'
  ])('allows storage at %s', (url) => {
    expect(isAllowedDownloadUrl(url)).toBe(true)
  })

  it.each([
    'https://evil.example.com/steal',
    'http://re-ex-files.s3.eu-west-2.amazonaws.com/f.xlsx',
    'https://re-ex-files.s3.eu-west-2.amazonaws.com.evil.example.com/f.xlsx',
    'file:///etc/passwd',
    'http://169.254.169.254/latest/meta-data/'
  ])('refuses %s', (url) => {
    expect(isAllowedDownloadUrl(url)).toBe(false)
  })
})

describe(signedDisposition, () => {
  it('reads the name the URL was signed to be served under', () => {
    const disposition = 'attachment; filename="figures.zip"'

    expect(
      signedDisposition(
        `https://re-ex-files.s3.eu-west-2.amazonaws.com/f.zip?response-content-disposition=${encodeURIComponent(disposition)}`
      )
    ).toBe(disposition)
  })

  it('is nothing where the URL named none', () => {
    expect(
      signedDisposition('https://re-ex-files.s3.eu-west-2.amazonaws.com/f.zip')
    ).toBeNull()
  })
})
