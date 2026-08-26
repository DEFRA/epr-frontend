import {
  cspFormAction,
  cspOptions
} from '#server/common/helpers/content-security-policy.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect, test } from 'vitest'

const govukInlineScriptHash =
  "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"

describe(cspFormAction, () => {
  test.each([
    ['non-production', { isProduction: false }, ['self', 'localhost:*']],
    ['production', { isProduction: true }, ['self']]
  ])('should use %s values', (_, config, values) => {
    expect(cspFormAction(config)).toStrictEqual(values)
  })
})

describe(cspOptions, () => {
  it('should not reach any google origin when analytics is disabled', () => {
    const options = cspOptions({
      isProduction: false,
      allowAnalytics: false
    })

    expect(options).toStrictEqual({
      connectSrc: ['self', 'wss', 'data:'],
      defaultSrc: ['self'],
      fontSrc: ['self', 'data:'],
      formAction: ['self', 'localhost:*'],
      frameAncestors: ['none'],
      frameSrc: ['self', 'data:'],
      generateNonces: false,
      imgSrc: ['self', 'data:'],
      manifestSrc: ['self'],
      mediaSrc: ['self'],
      objectSrc: ['none'],
      scriptSrc: ['self', govukInlineScriptHash],
      styleSrc: ['self']
    })
  })

  it('should allow the gtag script and analytics endpoints when analytics is enabled', () => {
    const options = cspOptions({
      isProduction: true,
      allowAnalytics: true
    })

    expect(options).toStrictEqual({
      connectSrc: [
        'self',
        'wss',
        'data:',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com'
      ],
      defaultSrc: ['self'],
      fontSrc: ['self', 'data:'],
      formAction: ['self'],
      frameAncestors: ['none'],
      frameSrc: ['self', 'data:'],
      generateNonces: false,
      imgSrc: ['self', 'data:', 'https://*.google-analytics.com'],
      manifestSrc: ['self'],
      mediaSrc: ['self'],
      objectSrc: ['none'],
      scriptSrc: [
        'self',
        govukInlineScriptHash,
        'https://www.googletagmanager.com'
      ],
      styleSrc: ['self']
    })
  })
})

describe('#contentSecurityPolicy', () => {
  it('should set the CSP policy header', async ({ server }) => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toBe(
      [
        "base-uri 'self'",
        "connect-src 'self' wss data:",
        "default-src 'self'",
        "font-src 'self' data:",
        "form-action 'self' localhost:*",
        "frame-ancestors 'none'",
        "frame-src 'self' data:",
        "img-src 'self' data:",
        "manifest-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "script-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
        "style-src 'self'",
        "worker-src 'self'"
      ].join(';')
    )
  })
})
