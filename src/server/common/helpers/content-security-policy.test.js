import { cspFormAction } from '#server/common/helpers/content-security-policy.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe(cspFormAction, () => {
  it.each([
    [
      'non-production',
      { isProduction: false, oidcConfigurationUrl: '' },
      ['self', 'localhost:*']
    ],
    [
      'non-production (defra-id)',
      {
        isProduction: false,
        oidcConfigurationUrl: 'https://dcimtest.b2clogin.com'
      },
      ['self', 'dcimtest.b2clogin.com', 'localhost:*']
    ],
    ['production', { isProduction: true, oidcConfigurationUrl: '' }, ['self']],
    [
      'production (defra-id)',
      {
        isProduction: true,
        oidcConfigurationUrl: 'https://dcimtest.b2clogin.com'
      },
      ['self', 'dcimtest.b2clogin.com']
    ]
  ])('should use %s values', (_, config, values) => {
    expect(cspFormAction(config)).toStrictEqual(values)
  })
})

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('should set the CSP policy header', async () => {
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
