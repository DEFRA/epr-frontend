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
  it.for([
    { description: 'analytics is disabled', allowPreview: false },
    { description: 'only preview is switched on', allowPreview: true }
  ])(
    'should not reach any google origin when $description',
    ({ allowPreview }) => {
      const options = cspOptions({
        isProduction: false,
        allowAnalytics: false,
        allowPreview
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
    }
  )

  it('should allow the tag manager script and analytics endpoints when analytics is enabled', () => {
    const options = cspOptions({
      isProduction: true,
      allowAnalytics: true,
      allowPreview: false
    })

    expect(options).toStrictEqual({
      connectSrc: [
        'self',
        'wss',
        'data:',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://www.googletagmanager.com'
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

  it('should add only the preview origins when preview is switched on', () => {
    const options = cspOptions({
      isProduction: false,
      allowAnalytics: true,
      allowPreview: true
    })

    expect(options).toStrictEqual({
      connectSrc: [
        'self',
        'wss',
        'data:',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://www.googletagmanager.com'
      ],
      defaultSrc: ['self'],
      fontSrc: ['self', 'data:', 'https://fonts.gstatic.com'],
      formAction: ['self', 'localhost:*'],
      frameAncestors: ['none'],
      frameSrc: ['self', 'data:'],
      generateNonces: false,
      imgSrc: [
        'self',
        'data:',
        'https://*.google-analytics.com',
        'https://www.googletagmanager.com',
        'https://ssl.gstatic.com',
        'https://www.gstatic.com'
      ],
      manifestSrc: ['self'],
      mediaSrc: ['self'],
      objectSrc: ['none'],
      scriptSrc: [
        'self',
        govukInlineScriptHash,
        'https://www.googletagmanager.com',
        'https://tagmanager.google.com'
      ],
      styleSrc: [
        'self',
        'https://www.googletagmanager.com',
        'https://tagmanager.google.com',
        'https://fonts.googleapis.com'
      ]
    })
  })

  describe('whatever is switched on', () => {
    const everyCombination = [false, true].flatMap((allowAnalytics) =>
      [false, true].flatMap((allowPreview) =>
        [false, true].map((isProduction) => ({
          allowAnalytics,
          allowPreview,
          isProduction
        }))
      )
    )

    it.for(everyCombination)(
      'should never let the container vouch for scripts it injects with analytics $allowAnalytics, preview $allowPreview, production $isProduction',
      (switches) => {
        const options = cspOptions(switches)
        const sources = Object.values(options).flat().map(String)

        expect(options.generateNonces).toBe(false)
        expect(sources).not.toContainEqual(
          expect.stringMatching(/unsafe-inline|strict-dynamic|nonce-/)
        )
        expect(options.frameSrc).toStrictEqual(['self', 'data:'])
      }
    )
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
