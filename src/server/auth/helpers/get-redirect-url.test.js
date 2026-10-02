import { config } from '#config/config.js'
import { afterEach, describe, expect, it } from 'vitest'
import { getRedirectUrl } from './get-redirect-url.js'

/** @import { HapiRequest } from '#server/common/hapi-types.js' */

describe(getRedirectUrl, () => {
  afterEach(() => {
    config.reset('appBaseUrl')
    config.reset('allowedRedirectOrigins')
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
        'return redirect URL when request origin matches a configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['https://service.defra.gov.uk'],
      host: 'service.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://service.defra.gov.uk/auth/callback'
    },
    {
      scenario:
        'return redirect URL when request origin matches the second of several configured origins',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: [
        'https://service.defra.gov.uk',
        'https://vanity.defra.gov.uk'
      ],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://vanity.defra.gov.uk/auth/callback'
    },
    {
      scenario: 'tolerate whitespace around a configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: [' https://vanity.defra.gov.uk '],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://vanity.defra.gov.uk/auth/callback'
    },
    {
      scenario: 'tolerate a trailing slash on a configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['https://vanity.defra.gov.uk/'],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://vanity.defra.gov.uk/auth/callback'
    },
    {
      scenario: 'tolerate an upper case host in a configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['https://VANITY.Defra.gov.uk'],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://vanity.defra.gov.uk/auth/callback'
    },
    {
      scenario: 'tolerate an explicit default port on a configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['https://vanity.defra.gov.uk:443'],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://vanity.defra.gov.uk/auth/callback'
    },
    {
      scenario:
        'fall back to appBaseUrl when a configured origin has no scheme',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['vanity.defra.gov.uk'],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://test.example.com/auth/callback'
    },
    {
      scenario:
        'fall back to appBaseUrl when a trailing separator leaves an empty configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: [''],
      host: 'vanity.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://test.example.com/auth/callback'
    },
    {
      scenario:
        'fall back to appBaseUrl when no origins are configured for the environment',
      appBaseUrl: 'https://test.example.com',
      host: 'service.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://test.example.com/auth/callback'
    },
    {
      scenario:
        'fall back to appBaseUrl when request origin is not in allowed list',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['https://service.defra.gov.uk'],
      host: 'malicious-site.com',
      headers: { 'x-forwarded-proto': 'https' },
      serverProtocol: 'http',
      expected: 'https://test.example.com/auth/callback'
    },
    {
      scenario:
        'fall back to appBaseUrl when the request protocol differs from the configured origin',
      appBaseUrl: 'https://test.example.com',
      allowedRedirectOrigins: ['https://service.defra.gov.uk'],
      host: 'service.defra.gov.uk',
      headers: { 'x-forwarded-proto': 'http' },
      serverProtocol: 'https',
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
    ({
      appBaseUrl,
      allowedRedirectOrigins = [],
      host,
      headers,
      serverProtocol,
      expected
    }) => {
      config.set('appBaseUrl', appBaseUrl)
      config.set('allowedRedirectOrigins', allowedRedirectOrigins)

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
