import { config } from '#config/config.js'
import { afterEach, describe, expect, it } from 'vitest'
import { getRedirectUrl } from './get-redirect-url.js'

/** @import { HapiRequest } from '#server/common/hapi-types.js' */

describe(getRedirectUrl, () => {
  afterEach(() => {
    config.reset('appBaseUrl')
  })

  it.each([
    {
      scenario: 'return redirect URL when request origin matches appBaseUrl',
      appBaseUrl: 'https://test.example.com',
      host: 'test.example.com',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://test.example.com/auth/callback'
    },
    {
      scenario:
        'return redirect URL when request origin matches production URL',
      appBaseUrl: 'https://test.example.com',
      host: 'record-reprocessed-exported-packaging-waste.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected:
        'https://record-reprocessed-exported-packaging-waste.defra.gov.uk/auth/callback'
    },
    {
      scenario:
        'fall back to appBaseUrl when request origin is not in allowed list',
      appBaseUrl: 'https://test.example.com',
      host: 'malicious-site.com',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://test.example.com/auth/callback'
    },
    {
      scenario: 'use x-forwarded-proto header for protocol detection',
      appBaseUrl: 'http://localhost:3000',
      host: 'localhost:3000',
      headers: { 'x-forwarded-proto': 'http' },
      serverProtocol: 'https',
      expected: 'http://localhost:3000/auth/callback'
    },
    {
      scenario:
        'fall back to server protocol when x-forwarded-proto is not present',
      appBaseUrl: 'http://localhost:3000',
      host: 'localhost:3000',
      headers: {},
      serverProtocol: 'http',
      expected: 'http://localhost:3000/auth/callback'
    },
    {
      scenario: 'ignore invalid x-forwarded-proto values',
      appBaseUrl: 'http://localhost:3000',
      host: 'localhost:3000',
      headers: { 'x-forwarded-proto': 'javascript' },
      serverProtocol: 'http',
      expected: 'http://localhost:3000/auth/callback'
    }
  ])(
    'should $scenario',
    ({ appBaseUrl, host, headers, serverProtocol, expected }) => {
      config.set('appBaseUrl', appBaseUrl)

      const mockRequest = /** @type {HapiRequest} */ ({
        info: { host },
        headers,
        server: { info: { protocol: serverProtocol } }
      })

      const result = getRedirectUrl(mockRequest, '/auth/callback')

      expect(result).toBe(expected)
    }
  )
})
