import { config } from '#config/config.js'
import { afterEach, describe, expect, it } from 'vitest'
import { getRedirectUrl } from './get-redirect-url.js'

describe(getRedirectUrl, () => {
  afterEach(() => {
    config.reset('appBaseUrl')
  })

  it('should return redirect URL when request origin matches appBaseUrl', () => {
    config.set('appBaseUrl', 'https://test.example.com')

    const mockRequest = {
      info: { host: 'test.example.com' },
      headers: { 'x-forwarded-proto': 'https' },
      server: { info: { protocol: 'http' } }
    }

    const result = getRedirectUrl(mockRequest, '/auth/callback')

    expect(result).toBe('https://test.example.com/auth/callback')
  })

  it('should return redirect URL when request origin matches production URL', () => {
    config.set('appBaseUrl', 'https://test.example.com')

    const mockRequest = {
      info: {
        host: 'record-reprocessed-exported-packaging-waste.defra.gov.uk'
      },
      headers: { 'x-forwarded-proto': 'https' },
      server: { info: { protocol: 'http' } }
    }

    const result = getRedirectUrl(mockRequest, '/auth/callback')

    expect(result).toBe(
      'https://record-reprocessed-exported-packaging-waste.defra.gov.uk/auth/callback'
    )
  })

  it('should fall back to appBaseUrl when request origin is not in allowed list', () => {
    config.set('appBaseUrl', 'https://test.example.com')

    const mockRequest = {
      info: { host: 'malicious-site.com' },
      headers: { 'x-forwarded-proto': 'https' },
      server: { info: { protocol: 'http' } }
    }

    const result = getRedirectUrl(mockRequest, '/auth/callback')

    expect(result).toBe('https://test.example.com/auth/callback')
  })

  it('should use x-forwarded-proto header for protocol detection', () => {
    config.set('appBaseUrl', 'http://localhost:3000')

    const mockRequest = {
      info: { host: 'localhost:3000' },
      headers: { 'x-forwarded-proto': 'http' },
      server: { info: { protocol: 'https' } }
    }

    const result = getRedirectUrl(mockRequest, '/auth/callback')

    expect(result).toBe('http://localhost:3000/auth/callback')
  })

  it('should fall back to server protocol when x-forwarded-proto is not present', () => {
    config.set('appBaseUrl', 'http://localhost:3000')

    const mockRequest = {
      info: { host: 'localhost:3000' },
      headers: {},
      server: { info: { protocol: 'http' } }
    }

    const result = getRedirectUrl(mockRequest, '/auth/callback')

    expect(result).toBe('http://localhost:3000/auth/callback')
  })

  it('should ignore invalid x-forwarded-proto values', () => {
    config.set('appBaseUrl', 'http://localhost:3000')

    const mockRequest = {
      info: { host: 'localhost:3000' },
      headers: { 'x-forwarded-proto': 'javascript' },
      server: { info: { protocol: 'http' } }
    }

    const result = getRedirectUrl(mockRequest, '/auth/callback')

    expect(result).toBe('http://localhost:3000/auth/callback')
  })
})
